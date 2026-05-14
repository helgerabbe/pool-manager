/**
 * acquireUnitLockSecure.js – „Unified Unit Lock"
 *
 * Ein einziger Endpunkt für ALLE Struktur-Locks auf Einheiten-Ebene.
 * Ersetzt die separaten Endpunkte `acquireStructuralLockSecure` (Tab 2)
 * und `acquireDashboardLockSecure` (Tab 7).
 *
 * Payload: { einheit_id, scope }
 *   - scope === 'structure'  → Tab 2 (Struktur-Bearbeitung)
 *   - scope === 'dashboard'  → Tab 7 (Lernpfad-Architekt)
 *
 * 5-Phasen-Protokoll
 * ──────────────────
 *  1) Türsteher    – Auth + einheitliche RBAC-Prüfung (gleiches Recht für
 *                    Struktur und Dashboard).
 *  2) Deep Scan    – Konflikt-Erkennung. Für 'dashboard' zusätzlich:
 *                    aktive Lernpaket-Locks und AllgemeineAufgabe-Locks.
 *                    Stale Locks (überschritten Timeout) werden ignoriert.
 *  3) OCC-Update   – Read-Bump-Write via `acquireLockWithVersion`-Pattern
 *                    (inline kopiert aus functions/utils/occLockUtils.js).
 *  4) Re-Read      – frischer Re-Read via asServiceRole. Steht UNSERE
 *                    E-Mail im Lock-Feld → Erfolg. Sonst: race_lost
 *                    (KEIN Rollback – würde den rechtmäßigen Sieger
 *                    zerstören).
 *  5) Transparente UX – Display-Name-Auflösung über die Benutzer-Entity,
 *                       damit der Client „Max Mustermann" statt
 *                       „max@…" anzeigen kann.
 *
 * @MIGRATION_NOTE (Supabase):
 *   - RBAC wandert in RLS-Policies.
 *   - `version`-Bump in BEFORE-UPDATE-Trigger.
 *   - Inline-Kopie wird durch Import aus occLockUtils.js ersetzt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// AFK-Polish 2026-05-14: Alle Lock-Timeouts auf 5 Min reduziert.
// Aktive User halten ihre Locks über Heartbeats (alle 25 s, useLocks.js).
// Im AFK-/Crash-Fall werden verwaiste Locks vom lockReaper damit nach
// max. 5 Min weggeräumt statt nach 30–60 Min.
const STRUCT_LOCK_TIMEOUT_MS  = 5 * 60 * 1000;
const PAKET_LOCK_TIMEOUT_MS   = 5 * 60 * 1000;
const AUFGABE_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const VALID_SCOPES = new Set(['structure', 'dashboard']);

// ──────────────────────────────────────────────────────────────────────
// Inline-Kopie aus functions/utils/occLockUtils.js (Single Source of Truth).
// Bei Änderungen MUSS occLockUtils.js mitgepflegt werden.
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

// ── Helpers: Forensik & Display-Name ──────────────────────────────────
async function logLockConflict(base44, { user, einheit_id, scope, reason, blockerScope, lockedByEmail }) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Einheiten',
      resource_id: einheit_id,
      changes: { scope, blockerScope: blockerScope || null, lockedByEmail },
      affected_count: 1,
      status: 'failed',
      error_message: `unit_lock_${reason}`,
    });
  } catch (err) {
    console.warn('[acquireUnitLockSecure] audit log failed:', err.message);
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
    // Display-Name ist Kosmetik – Fallback auf E-Mail beim Aufrufer.
  }
  return email;
}

/**
 * Phase 1: Einheitliche RBAC-Prüfung.
 * Wer hier `true` zurückbekommt, darf BEIDE scopes verwenden.
 * Regel (gemäß BACKEND_SECURITY_ARCHITECTURE.md §1.2):
 *   - Administrator                        → frei
 *   - Fachschaftsleitung MIT Fachzuständigkeit für einheit.fach → frei
 *   - Sonst: explizite EinheitMembers-LEITUNG-Mitgliedschaft
 */
async function checkUnifiedPermission(base44, user, einheit) {
  if (user.role === 'admin') return { allowed: true };

  const benutzerList = await base44.asServiceRole.entities.Benutzer.filter({
    user_id: user.email,
  });
  const benutzer = benutzerList?.[0];
  const rolle = benutzer?.rolle;

  if (rolle === 'Administrator') return { allowed: true };

  if (rolle === 'Fachschaftsleitung') {
    const fachzustaendig =
      benutzer?.fachbereich_zustaendigkeit?.includes(einheit.fach) || false;
    if (fachzustaendig) return { allowed: true };
  }

  // Fallback: Unit-Level LEITUNG
  const members = await base44.asServiceRole.entities.EinheitMembers.filter({
    einheit_id: einheit.id,
    user_email: user.email,
    unit_role: 'LEITUNG',
  });
  if (members.length > 0) return { allowed: true };

  return { allowed: false, reason: 'Keine Berechtigung für Einheiten-Bearbeitung' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheit_id, scope } = await req.json();
    if (!einheit_id) {
      return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    }
    if (!scope || !VALID_SCOPES.has(scope)) {
      return Response.json(
        { error: `Invalid scope. Expected 'structure' or 'dashboard'.` },
        { status: 400 }
      );
    }

    // ── Einheit laden (für RBAC-Fach-Check + Existenz-Prüfung) ──
    const einheit = await base44.entities.Einheiten.get(einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // ── PHASE 1: Türsteher (Auth + einheitliche RBAC) ──────────────
    const perm = await checkUnifiedPermission(base44, user, einheit);
    if (!perm.allowed) {
      return Response.json({ error: perm.reason }, { status: 403 });
    }

    // ── Lifecycle Hard-Lock ────────────────────────────────────────────
    // Final freigegebene oder im Export befindliche Einheiten dürfen
    // gar nicht erst zur Bearbeitung gelockt werden — weder Tab 2 noch
    // Tab 7. Damit ist auch garantiert, dass keine Folge-UI (DnD, Save,
    // Sektor-Patches) anlaufen kann.
    const lifecycleStatus = einheit.export_lifecycle_status || 'draft';
    if (lifecycleStatus === 'final_freigegeben' || lifecycleStatus === 'export_running') {
      return Response.json(
        {
          success: false,
          reason: 'einheit_final_locked',
          lifecycleStatus,
          error:
            'Die Einheit ist final freigegeben und gesperrt. Die Bearbeitung kann erst nach Aufhebung der Freigabe wieder gestartet werden.',
        },
        { status: 423 }
      );
    }

    const now = Date.now();

    // ── PHASE 2: Deep Scan ─────────────────────────────────────────
    // Hinweis: Der Struktur-Lock-Check selbst läuft erst in Phase 3 als
    // Teil des OCC-Wrappers (state-check). Stale Locks werden dort
    // korrekt ignoriert.
    //
    // Konzept-Update 2026-05-14 (Schutz vor "Kick-Out durch Fachschaftsleitung"):
    // Der TIEF-SCAN auf aktive Lernpaket- und AllgemeineAufgabe-Locks läuft
    // jetzt für BEIDE Scopes ('structure' wie 'dashboard'). Begründung:
    // Sowohl Tab 2 (Strukturbearbeitung) als auch Tab 7 (Lernpfad-Architekt)
    // verändern Daten, die granular gesperrte Lernpakete/Aufgaben betreffen
    // können (Themenfelder verschieben, Lernpakete umsortieren, Pfade neu
    // legen). Wir lassen einen Unit-Lock-Erwerb daher nur zu, wenn keine
    // andere Lehrkraft aktuell auf untergeordneten Entitäten arbeitet —
    // sonst würde ihre Arbeit beim nächsten SSE-Update read-only und
    // ungespeicherte Eingaben gingen verloren.
    {
      // 2a. Aktive Lernpaket-Locks anderer User
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
          user, einheit_id, scope, reason: 'unit_busy', blockerScope: 'lernpaket',
          lockedByEmail: aktivesPaket.locked_by_email,
        });
        return Response.json(
          {
            success: false, reason: 'unit_busy', scope: 'lernpaket',
            lockedByEmail: aktivesPaket.locked_by_email, lockedByName: displayName,
            blockerTitle: aktivesPaket.titel_des_pakets || null,
          },
          { status: 409 }
        );
      }

      // 2b. Aktive AllgemeineAufgabe-Locks anderer User
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
          user, einheit_id, scope, reason: 'unit_busy', blockerScope: 'aufgabe',
          lockedByEmail: aktiveAufgabe.locked_by,
        });
        return Response.json(
          {
            success: false, reason: 'unit_busy', scope: 'aufgabe',
            lockedByEmail: aktiveAufgabe.locked_by, lockedByName: displayName,
            blockerTitle: aktiveAufgabe.titel || null,
          },
          { status: 409 }
        );
      }
    }

    // ── PHASE 3 + 4: OCC-Update + Re-Read-Verify ──────────────────
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
      // PHASE 5: Display-Name auflösen für saubere UX.
      const displayName = await resolveDisplayName(base44, result.lockedByEmail);
      const reason = result.reason === 'busy' ? 'unit_busy' : 'race_lost';
      await logLockConflict(base44, {
        user, einheit_id, scope, reason, blockerScope: 'struktur',
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

    // Erfolg → Audit-Eintrag.
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: 'UPDATE',
        resource_type: 'Einheiten',
        resource_id: einheit_id,
        changes: { unit_lock_acquired: true, scope, version: result.version },
        affected_count: 1,
        status: 'success',
      });
    } catch (err) {
      console.warn('[acquireUnitLockSecure] success audit failed:', err.message);
    }

    return Response.json({
      success: true,
      scope,
      lockedBy: user.email,
      lockedAt: result.lockedAt,
      version: result.version,
    });
  } catch (error) {
    console.error('[acquireUnitLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});