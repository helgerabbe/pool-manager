import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const { einheitId } = body;

    if (!einheitId) {
      return Response.json({ error: 'Missing einheitId' }, { status: 400 });
    }

    const einheit = await base44.entities.Einheiten.get(einheitId).catch(() => null);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    const sixtyMinutes = 60 * 60 * 1000;
    const lockAge = einheit.structural_locked_at
      ? Date.now() - new Date(einheit.structural_locked_at).getTime()
      : Infinity;
    const isStale = lockAge > sixtyMinutes;
    const isLockedByOther = !!einheit.structural_lock && einheit.structural_lock !== user.email;

    if (isLockedByOther && !isStale) {
      return Response.json(
        {
          success: false,
          reason: 'locked_by_other',
          lockedByEmail: einheit.structural_lock,
          lockedAt: einheit.structural_locked_at,
        },
        { status: 409 }
      );
    }

    if (einheit.structural_lock && isStale) {
      console.log('[lockEinheit] Stale lock detected, overriding');
    }

    const now = new Date().toISOString();
    const currentEinheitVersion = Number.isFinite(einheit?.version) ? einheit.version : 1;

    // OCC-Hinweis: Das Base44-SDK unterstützt hier kein bedingtes Update
    // (WHERE id = X AND version = Y). Die finale Race-Condition-Sicherung
    // muss später über DB-Trigger / atomare Conditional Updates erfolgen.
    const updated = await base44.entities.Einheiten.update(einheitId, {
      structural_lock: user.email,
      structural_locked_at: now,
      version: currentEinheitVersion + 1,
    });

    return Response.json({
      success: true,
      lockedByEmail: updated.structural_lock,
      lockedAt: updated.structural_locked_at,
      version: updated.version,
    });
  } catch (error) {
    console.error('[lockEinheit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});