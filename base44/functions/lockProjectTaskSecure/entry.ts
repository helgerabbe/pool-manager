/**
 * lockProjectTaskSecure.js
 *
 * Sperrt eine Projektaufgabe im User-Kontext.
 * - RLS/Tenant-Isolation greift über base44.entities.*
 * - Lock läuft nach 60 Minuten automatisch ab
 * - Best-effort OCC: Version-Bump + Re-Read-Verify
 *
 * Hinweis: Ohne echte bedingte DB-Updates bleibt vollständige Atomizität eine
 * Aufgabe für DB-Trigger bzw. native OCC-Policies.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LOCK_TIMEOUT_MS = 60 * 60 * 1000;
// Struktur-Lock-Gültigkeit: 5 Min, gehalten per Heartbeat (pages/Workspace).
const STRUCT_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

async function resolveDisplayName(base44, email) {
  if (!email) return null;
  try {
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({ user_id: email });
    const b = benutzer?.[0];
    if (b?.vorname || b?.nachname) {
      return `${b.vorname || ''} ${b.nachname || ''}`.trim();
    }
  } catch (_e) {
    // Anzeigename ist Kosmetik.
  }
  return null;
}

async function acquireProjectTaskLock(base44, taskId, userEmail) {
  // Self-Lockout-Fix 2026-06-10: State-Read + VERIFY beide über asServiceRole
  // + VERIFY-Retry. Begründung siehe occLockUtils.js.
  const aufgabe = await base44.asServiceRole.entities.AllgemeineAufgabe.get(taskId).catch(() => null);
  if (!aufgabe) {
    return { ok: false, reason: 'not_found' };
  }

  const einheit = await base44.asServiceRole.entities.Einheiten.get(aufgabe.einheit_id).catch(() => null);
  if (!einheit) {
    return { ok: false, reason: 'einheit_not_found' };
  }

  // ⛔ Struktur-Lock der Einheit (Lock-Audit 2026-06-10): Während die Einheit
  // strukturell bearbeitet wird (Strukturboard/Dashboards), dürfen keine
  // Projektaufgaben-Locks vergeben werden — analog lockTaskSecure.
  if (einheit.structural_lock && einheit.structural_lock !== userEmail) {
    const structAge = einheit.structural_locked_at
      ? Date.now() - new Date(einheit.structural_locked_at).getTime()
      : 0;
    if (structAge < STRUCT_LOCK_TIMEOUT_MS) {
      return {
        ok: false,
        reason: 'unit_structural_locked',
        lockedBy: einheit.structural_lock,
        lockedAt: einheit.structural_locked_at,
      };
    }
  }

  const lockedByOther = aufgabe.locked_by && aufgabe.locked_by !== userEmail;
  const lockAge = aufgabe.locked_at ? Date.now() - new Date(aufgabe.locked_at).getTime() : Infinity;
  const isStale = lockAge > LOCK_TIMEOUT_MS;

  if (lockedByOther && !isStale) {
    return {
      ok: false,
      reason: 'busy',
      lockedBy: aufgabe.locked_by,
      lockedAt: aufgabe.locked_at,
    };
  }

  const currentVersion = Number.isFinite(aufgabe.version) ? aufgabe.version : 1;
  const nextVersion = currentVersion + 1;
  const lockedAt = new Date().toISOString();

  await base44.entities.AllgemeineAufgabe.update(taskId, {
    locked_by: userEmail,
    locked_at: lockedAt,
    version: nextVersion,
  });

  let verify = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    verify = await base44.asServiceRole.entities.AllgemeineAufgabe.get(taskId);
    if (verify?.locked_by === userEmail) {
      return { ok: true, version: nextVersion, lockedAt };
    }
    if (verify?.locked_by && verify.locked_by !== userEmail) {
      return {
        ok: false,
        reason: 'race_lost',
        lockedBy: verify.locked_by,
        lockedAt: verify?.locked_at || null,
      };
    }
    await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
  }

  await base44.entities.AllgemeineAufgabe.update(taskId, {
    locked_by: userEmail,
    locked_at: lockedAt,
  });
  verify = await base44.asServiceRole.entities.AllgemeineAufgabe.get(taskId);
  if (verify?.locked_by === userEmail) {
    return { ok: true, version: nextVersion, lockedAt };
  }
  return {
    ok: false,
    reason: 'race_lost',
    lockedBy: verify?.locked_by || null,
    lockedAt: verify?.locked_at || null,
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { taskId } = body;

    if (!taskId) {
      return Response.json({ error: 'taskId required' }, { status: 400 });
    }

    const result = await acquireProjectTaskLock(base44, taskId, user.email);

    if (result.ok) {
      return Response.json({ success: true, version: result.version, locked_at: result.lockedAt });
    }

    if (result.reason === 'not_found') {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    if (result.reason === 'einheit_not_found') {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    if (result.reason === 'unit_structural_locked') {
      const displayName = (await resolveDisplayName(base44, result.lockedBy)) || 'einer anderen Person';
      return Response.json(
        {
          error: `🔒 Die Einheit wird gerade strukturell von ${displayName} überarbeitet. Aufgaben können währenddessen nicht bearbeitet werden.`,
          locked_by: result.lockedBy,
          locked_at: result.lockedAt,
          code: 'UNIT_STRUCTURAL_LOCKED',
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        error: `Wird gerade von ${result.lockedBy || 'einer anderen Person'} bearbeitet.`,
        locked_by: result.lockedBy,
        locked_at: result.lockedAt,
        code: result.reason === 'race_lost' ? 'RACE_LOST' : 'ALREADY_LOCKED',
      },
      { status: 409 }
    );
  } catch (error) {
    console.error('[lockProjectTaskSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});