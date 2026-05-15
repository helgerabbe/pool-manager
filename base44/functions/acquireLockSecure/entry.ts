/**
 * acquireLockSecure.js
 *
 * Sperrt ein Lernpaket mit RBAC-Prüfung und Race-Condition-Schutz (OCC).
 *
 * Race-Condition-Schutz:
 *   Read-Bump-ReRead-Verify wird über die zentrale Hilfsfunktion
 *   `acquireLockWithVersion` aus `functions/utils/occLockUtils.js`
 *   abgewickelt. Wegen der „NO LOCAL IMPORTS"-Regel ist der Wrapper
 *   unten **inline kopiert** – bei Änderungen MUSS die Quelle in
 *   occLockUtils.js mitgepflegt werden.
 *
 * RBAC (siehe BACKEND_SECURITY_ARCHITECTURE.md §1.2):
 *   - Admin → frei.
 *   - Fachschaftsleitung NUR mit Fachzuständigkeit (mustOwnSubject = true).
 *   - Sonst: explizite EinheitMembers-Mitgliedschaft.
 *
 * Privacy:
 *   E-Mail des blockierenden Nutzers landet NICHT mehr im sichtbaren
 *   Fehlertext; stattdessen wird best-effort ein Anzeigename aus
 *   `Benutzer` aufgelöst. Strukturierte Felder (`locked_by_email`)
 *   bleiben im Response-Body für Admin-Tools/Forensik erhalten.
 *
 * @MIGRATION_NOTE (Supabase):
 *   - RBAC-Block wird durch Postgres-RLS-Policies ersetzt.
 *   - Versions-Bump wandert in BEFORE-UPDATE-Trigger.
 *   - `locked_by_email` sollte auf `locked_by_user_id` (UUID) umgestellt
 *     werden – E-Mails sind veränderliche PII.
 *   - Inline-Wrapper wird durch echten Import aus occLockUtils.js ersetzt.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// AFK-Polish 2026-05-14: Timeout von 30 Min auf 5 Min reduziert.
// Aktive User halten den Lock über Heartbeat (alle 25 s, useLocks.js).
// Im AFK-/Crash-Fall fliegt der verwaiste Lock damit nach 5 Min weg
// statt nach 30 Min, was die Frustration drastisch reduziert.
const PAKET_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const STRUCTURAL_LOCK_TIMEOUT_MS = 60 * 60 * 1000;

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

async function resolveDisplayName(base44, email) {
  if (!email) return null;
  try {
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const b = benutzer?.[0];
    if (b?.vorname || b?.nachname) {
      return `${b.vorname || ''} ${b.nachname || ''}`.trim();
    }
  } catch (_e) {
    // Display-Name ist nur Kosmetik – Fallback unten greift.
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lernpaketId } = await req.json();
    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId required' }, { status: 400 });
    }

    // Hole Paket + Einheit für RBAC und Toast-Texte.
    const paket = await base44.entities.Lernpakete.get(lernpaketId);
    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }
    const einheit = await base44.entities.Einheiten.get(paket.einheit_id);
    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // ── Lifecycle Hard-Lock ────────────────────────────────────────────
    // Final freigegebene oder im Export befindliche Einheiten dürfen
    // keine Lernpaket-Locks mehr vergeben — auch nicht für Admins.
    const lifecycleStatus = einheit.export_lifecycle_status || 'draft';
    if (lifecycleStatus === 'final_freigegeben' || lifecycleStatus === 'export_running') {
      return Response.json(
        {
          error: 'Die Einheit ist final freigegeben und gesperrt. Lernpakete können nicht bearbeitet werden, solange die Einheit-Freigabe aktiv ist.',
          code: 'EINHEIT_FINAL_LOCKED',
          lifecycleStatus,
        },
        { status: 423 }
      );
    }

    // ── Structural Unit-Lock ──────────────────────────────────────────
    // Solange die Einheit strukturell bearbeitet wird, dürfen keine
    // untergeordneten Lernpaket-Locks vergeben werden.
    if (einheit.structural_lock) {
      const structuralLockedAt = einheit.structural_locked_at
        ? new Date(einheit.structural_locked_at).getTime()
        : null;
      const structuralLockAge = structuralLockedAt ? Date.now() - structuralLockedAt : 0;
      const structuralLockIsValid = !structuralLockedAt || structuralLockAge < STRUCTURAL_LOCK_TIMEOUT_MS;

      if (structuralLockIsValid) {
        const displayName =
          (await resolveDisplayName(base44, einheit.structural_lock)) || 'einer anderen Person';
        return Response.json(
          {
            error: `🔒 Die Einheit wird gerade strukturell von ${displayName} überarbeitet. Lernpakete können währenddessen nicht bearbeitet werden.`,
            lockedByName: displayName,
            locked_by_email: einheit.structural_lock,
            locked_at: einheit.structural_locked_at,
            code: 'UNIT_STRUCTURAL_LOCKED',
          },
          { status: 409 }
        );
      }
    }

    // ── RBAC ──────────────────────────────────────────────────────────
    const istAdmin = user.role === 'admin';
    if (!istAdmin) {
      const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
        user_id: user.email,
      });
      const benutzerRecord = benutzer?.[0];
      const rolle = benutzerRecord?.rolle;
      const fachzustaendig =
        benutzerRecord?.fachbereich_zustaendigkeit?.includes(einheit.fach) || false;
      const istFachschaftFuerFach = rolle === 'Fachschaftsleitung' && fachzustaendig;

      if (!istFachschaftFuerFach) {
        const members = await base44.asServiceRole.entities.EinheitMembers.filter({
          einheit_id: einheit.id,
          user_email: user.email,
        });
        if (members.length === 0) {
          return Response.json(
            { error: 'Keine Berechtigung für diese Einheit' },
            { status: 403 }
          );
        }
      }
    }

    // ── Lock setzen via OCC-Wrapper ──────────────────────────────────
    const result = await acquireLockWithVersion(base44, {
      entityName: 'Lernpakete',
      entityId: lernpaketId,
      lockField: 'locked_by_email',
      timeField: 'locked_at',
      userEmail: user.email,
      timeoutMs: PAKET_LOCK_TIMEOUT_MS,
      extraUpdate: { is_locked: true },
    });

    if (!result.ok) {
      if (result.reason === 'not_found') {
        return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
      }

      const displayName =
        (await resolveDisplayName(base44, result.lockedByEmail)) || 'einer anderen Lehrkraft';

      if (result.reason === 'busy') {
        const lockDurationSecs = result.lockedAt
          ? Math.round((Date.now() - new Date(result.lockedAt).getTime()) / 1000)
          : 0;
        const timelineMsg =
          lockDurationSecs < 60
            ? 'vor wenigen Sekunden'
            : `vor ${Math.round(lockDurationSecs / 60)} Minuten`;

        return Response.json(
          {
            error: `🔒 Das Lernpaket "${paket.titel_des_pakets}" wird gerade von ${displayName} bearbeitet (${timelineMsg}). Bitte warten Sie, bis die Bearbeitung abgeschlossen ist.`,
            lockedByName: displayName,
            locked_by_email: result.lockedByEmail,
            locked_at: result.lockedAt,
            lock_duration_seconds: lockDurationSecs,
            code: 'ALREADY_LOCKED',
          },
          { status: 409 }
        );
      }

      // race_lost
      return Response.json(
        {
          error: `🔒 Das Lernpaket "${paket.titel_des_pakets}" wurde im selben Moment von ${displayName} gesperrt. Bitte erneut versuchen.`,
          lockedByName: displayName,
          locked_by_email: result.lockedByEmail,
          code: 'RACE_LOST',
        },
        { status: 409 }
      );
    }

    return Response.json({ success: true, version: result.version });
  } catch (error) {
    console.error('[acquireLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});