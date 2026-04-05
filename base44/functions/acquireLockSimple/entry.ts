import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * acquireLockSimple
 * 
 * Sperrt ein Lernpaket für Bearbeitung.
 * Wenn schon gesperrt: Error mit locked_by_email
 * Erfolg: {success: true}
 */
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

    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Bereits gesperrt?
    if (paket.is_locked && paket.locked_by_email !== user.email) {
      return Response.json(
        { 
          error: `Locked by ${paket.locked_by_email}`,
          locked_by_email: paket.locked_by_email,
          code: 'ALREADY_LOCKED'
        },
        { status: 409 }
      );
    }

    // Sperre setzen
    await base44.entities.Lernpakete.update(lernpaketId, {
      is_locked: true,
      locked_by_email: user.email,
      locked_at: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[acquireLockSimple] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});