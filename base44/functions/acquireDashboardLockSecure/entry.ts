/**
 * acquireDashboardLockSecure.js
 *
 * Spezialisierter Lock-Erwerb für Tab 7 (Dashboards / Lernpfad-Architekt).
 *
 * Unterschied zu `acquireStructuralLockSecure`:
 *   Zusätzlich zum Struktur-Lock (Tab 2) werden hier auch alle
 *   *Inhalts-Locks* der Einheit geprüft – konkret:
 *     - Aktive `Lernpakete`-Locks  (is_locked + locked_by_email + locked_at < 30 Min)
 *     - Aktive `AllgemeineAufgabe`-Locks (locked_by + locked_at < 60 Min)
 *
 * Race-Condition-Schutz:
 *   Der eigentliche Read-Bump-ReRead-Verify-Pass für den Struktur-Lock
 *   nutzt die zentrale Hilfsfunktion `acquireLockWithVersion` aus
 *   `functions/utils/occLockUtils.js`. Wegen der „NO LOCAL IMPORTS"-Regel
 *   ist der Wrapper unten **inline kopiert**. Bei Änderungen MUSS die
 *   Quelle in occLockUtils.js mitgepflegt werden.
 *
 * @MIGRATION_NOTE (Supabase):
 *   Sobald lokale Imports möglich sind, wird der Inline-Block durch
 *   `import { acquireLockWithVersion } from './utils/occLockUtils.js'`
 *   ersetzt. Außerdem wandert das `version`-Inkrement in einen
 *   BEFORE-UPDATE-Trigger; die Funktion ruft dann nur noch ein konditionales
 *   Update („WHERE structural_lock IS NULL OR locked_at < now() - 60min")
 *   auf und entfällt das Re-Read-Verify-Konstrukt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STRUCT_LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min
const PAKET_LOCK_TIMEOUT_MS = 30 * 60 * 1000;  // 30 Min
const AUFGABE_LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min

// ──────────────────────────────────────────────────────────────────────
// Inline-Kopie aus functions/utils/occLockUtils.js (Single Source of Truth).
// NICHT divergieren lassen!
// ──────────────────────────────────────────────────────────────────────
async function acquireLockWithVersion(base44, config) {
  const {
    entityName, entityId, lockField, timeField,
    userEmail, timeoutMs, extraUpdate = {},
  } = config;
  if (!entityName || !entityId || !lockField || !timeField || !userEmail || !timeoutMs) {
    throw new Error('acquireLockWithVersion: missing required config field');
  }
  const record = await base44.entities[entityName].get(entityId);
  if (!record) {
    return { ok: false, reason: 'not_found', lockedByEmail: null, lockedAt: null };
  }
  const now = Date.now();
  const currentLockOwner = record[lockField];
  const currentLockedAt = record[timeField];
  if (currentLockOwner && currentLockOwner !== userEmail) {
    const lockAge = currentLockedAt ? now - new Date(currentLockedAt).getTime() : Infinity;
    if (lockAge < timeoutMs) {
      return {
        ok: false, reason: 'busy',
        lockedByEmail: currentLockOwner, lockedAt: currentLockedAt,
        currentRecord: record,
      };
    }
  }
  const currentVersion = Number.isFinite(record?.version) ? record.version : 1;
  const nextVersion = currentVersion + 1;
  const isoNow = new Date().toISOString();
  await base44.entities[entityName].update(entityId, {
    ...extraUpdate,
    [lockField]: userEmail,
    [timeField]: isoNow,
    version: nextVersion,
  });
  const verify = await base44.asServiceRole.entities[entityName].get(entityId);
  if (verify?.[lockField] !== userEmail) {
    return {
      ok: false, reason: 'race_lost',
      lockedByEmail: verify?.[lockField] || null,
      lockedAt: verify?.[timeField] || null,
      currentRecord: verify,
    };
  }
  return { ok: true, version: nextVersion, lockedAt: isoNow };
}

/**
 * Forensik: Lock-Konflikte (409) im AuditLog protokollieren, ohne den
 * Request-Pfad zu bremsen oder bei Logger-Fehlern abzubrechen.
 */
async function logLockConflict(base44, { user, einheit_id, reason, scope, lockedByEmail }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Einheiten',
      resource_id: einheit_id,
      changes: { scope, lockedByEmail },
      affected_count: 1,
      status: 'failed',
      error_message: `dashboard_lock_${reason}`,
    });
  } catch (err) {
    console.warn('[acquireDashboardLockSecure] audit log failed:', err.message);
  }
}

async function resolveDisplayName(base44, email) {
  if (!email) return null;
  try {
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const b = benutzer?.[0];
    if (b?.vorname || b?.nachname) {
      return `${b.vorname || ''} ${b.nachname || ''}`.trim();
    }
  } catch (_e) {
    // Display-Name ist nur Kosmetik; bei Fehler weiterhin E-Mail liefern.
  }
  return email;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheit_id } = await req.json();
    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }

    // ── RBAC: gleiche Regeln wie Struktur-Lock ─────────────────────────
    const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    const benutzer = benutzerList?.[0];
    const role = user.role === 'admin' ? 'Administrator' : (benutzer?.rolle || 'Betrachter');
    const istAdmin = role === 'Administrator';
    const istFachschaft = role === 'Fachschaftsleitung';

    if (!istAdmin && !istFachschaft) {
      const members = await base44.asServiceRole.entities.EinheitMembers.filter({
        einheit_id,
        user_email: user.email,
        unit_role: 'LEITUNG',
      });
      if (members.length === 0) {
        return Response.json(
          { error: 'Keine Berechtigung für Dashboard-Bearbeitung' },
          { status: 403 }
        );
      }
    }

    const now = Date.now();

    // ── 1. Aktive Lernpaket-Locks anderer User (DB-seitig gefiltert) ──
    const aktiveLernpakete = await base44.asServiceRole.entities.Lernpakete.filter({
      einheit_id,
      is_locked: true,
    });
    const aktivesPaket = (aktiveLernpakete || []).find(
      (p) =>
        p.locked_by_email &&
        p.locked_by_email !== user.email &&
        p.locked_at &&
        now - new Date(p.locked_at).getTime() < PAKET_LOCK_TIMEOUT_MS
    );
    if (aktivesPaket) {
      const displayName = await resolveDisplayName(base44, aktivesPaket.locked_by_email);
      await logLockConflict(base44, {
        user, einheit_id, reason: 'unit_busy', scope: 'lernpaket',
        lockedByEmail: aktivesPaket.locked_by_email,
      });
      return Response.json(
        {
          success: false, reason: 'unit_busy', scope: 'lernpaket',
          lockedByEmail: aktivesPaket.locked_by_email, lockedByName: displayName,
        },
        { status: 409 }
      );
    }

    // ── 2. Aktive AllgemeineAufgabe-Locks anderer User ────────────────
    let aktiveAufgaben;
    try {
      aktiveAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
        einheit_id,
        locked_by: { $ne: null },
      });
    } catch (_e) {
      aktiveAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({
        einheit_id,
      });
      aktiveAufgaben = (aktiveAufgaben || []).filter((a) => !!a.locked_by);
    }
    const aktiveAufgabe = (aktiveAufgaben || []).find(
      (a) =>
        a.locked_by !== user.email &&
        a.locked_at &&
        now - new Date(a.locked_at).getTime() < AUFGABE_LOCK_TIMEOUT_MS
    );
    if (aktiveAufgabe) {
      const displayName = await resolveDisplayName(base44, aktiveAufgabe.locked_by);
      await logLockConflict(base44, {
        user, einheit_id, reason: 'unit_busy', scope: 'aufgabe',
        lockedByEmail: aktiveAufgabe.locked_by,
      });
      return Response.json(
        {
          success: false, reason: 'unit_busy', scope: 'aufgabe',
          lockedByEmail: aktiveAufgabe.locked_by, lockedByName: displayName,
        },
        { status: 409 }
      );
    }

    // ── 3. Struktur-Lock setzen via OCC-Wrapper ───────────────────────
    const result = await acquireLockWithVersion(base44, {
      entityName: 'Einheiten',
      entityId: einheit_id,
      lockField: 'structural_lock',
      timeField: 'structural_locked_at',
      userEmail: user.email,
      timeoutMs: STRUCT_LOCK_TIMEOUT_MS,
    });

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return Response.json({ error: 'Einheit not found' }, { status: 404 });
      }
      const reason = result.reason === 'busy' ? 'unit_busy' : 'race_lost';
      const displayName = await resolveDisplayName(base44, result.lockedByEmail);
      await logLockConflict(base44, {
        user, einheit_id, reason, scope: 'struktur',
        lockedByEmail: result.lockedByEmail,
      });
      return Response.json(
        {
          success: false, reason, scope: 'struktur',
          lockedByEmail: result.lockedByEmail, lockedByName: displayName,
        },
        { status: 409 }
      );
    }

    // Erfolg – auch im AuditLog dokumentieren.
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Einheiten',
        resource_id: einheit_id,
        changes: { dashboard_lock_acquired: true, version: result.version },
        affected_count: 1,
        status: 'success',
      });
    } catch (err) {
      console.warn('[acquireDashboardLockSecure] success audit failed:', err.message);
    }

    return Response.json({
      success: true,
      lockedBy: user.email,
      lockedAt: result.lockedAt,
      version: result.version,
    });
  } catch (error) {
    console.error('[acquireDashboardLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});