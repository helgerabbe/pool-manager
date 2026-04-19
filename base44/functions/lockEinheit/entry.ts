import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { einheitId } = await req.json();

    if (!einheitId) {
      return Response.json({ error: 'Missing einheitId' }, { status: 400 });
    }

    // Hole die aktuelle Einheit
    const einheit = await base44.entities.Einheiten.get(einheitId);

    if (!einheit) {
      return Response.json({ error: 'Einheit not found' }, { status: 404 });
    }

    // Wenn bereits gesperrt von jemand anderem, lehne ab
    if (einheit.structural_lock && einheit.structural_lock !== user.email) {
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

    // Auto-Timeout: Wenn Lock > 60 Min alt, ignoriere ihn
    const lockAge = einheit.structural_locked_at
      ? Date.now() - new Date(einheit.structural_locked_at).getTime()
      : Infinity;
    const sixtyMinutes = 60 * 60 * 1000;
    
    if (lockAge > sixtyMinutes) {
      console.log('[lockEinheit] Stale lock detected, overriding');
    } else if (einheit.structural_lock) {
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

    // Setze Structural Lock
    const now = new Date().toISOString();
    await base44.entities.Einheiten.update(einheitId, {
      structural_lock: user.email,
      structural_locked_at: now,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[lockEinheit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});