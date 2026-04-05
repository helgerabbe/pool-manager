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
    if (einheit.is_unit_locked && einheit.unit_locked_by_email !== user.email) {
      return Response.json(
        {
          success: false,
          reason: 'locked_by_other',
          lockedByEmail: einheit.unit_locked_by_email,
        },
        { status: 409 }
      );
    }

    // Setze den Makro-Lock
    const now = new Date().toISOString();
    await base44.entities.Einheiten.update(einheitId, {
      is_unit_locked: true,
      unit_locked_by_email: user.email,
      unit_locked_at: now,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[lockEinheit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});