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

async function acquireProjectTaskLock(base44, taskId, userEmail) {
  const aufgabe = await base44.entities.AllgemeineAufgabe.get(taskId).catch(() => null);
  if (!aufgabe) {
    return { ok: false, reason: 'not_found' };
  }

  const einheit = await base44.entities.Einheiten.get(aufgabe.einheit_id).catch(() => null);
  if (!einheit) {
    return { ok: false, reason: 'einheit_not_found' };
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

  const verify = await base44.asServiceRole.entities.AllgemeineAufgabe.get(taskId);
  if (verify?.locked_by !== userEmail) {
    return {
      ok: false,
      reason: 'race_lost',
      lockedBy: verify?.locked_by || null,
      lockedAt: verify?.locked_at || null,
    };
  }

  return { ok: true, version: nextVersion, lockedAt };
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