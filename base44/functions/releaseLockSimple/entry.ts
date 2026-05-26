import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * releaseLockSimple
 * 
 * Entsperrt ein Lernpaket (setzt is_locked = false).
 * Prüft: gehört der Lock dem aktuellen User?
 * Erfolg: {success: true}
 */
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
    const { lernpaketId } = body;

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId required' }, { status: 400 });
    }

    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Nur entsperren wenn der User selbst der Locker ist
    if (paket.locked_by_email !== user.email && user.role !== 'admin') {
      return Response.json(
        { error: 'Lock does not belong to you' },
        { status: 403 }
      );
    }

    const latestPaket = await base44.entities.Lernpakete.get(lernpaketId).catch(() => null);
    if (!latestPaket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    const sameLockOwner = (latestPaket.locked_by_email || null) === (paket.locked_by_email || null);
    const sameLockTimestamp = (latestPaket.locked_at || null) === (paket.locked_at || null);
    if (!sameLockOwner || !sameLockTimestamp) {
      return Response.json(
        { error: 'Der Lock wurde zwischenzeitlich geändert. Bitte neu laden.', code: 'LOCK_CHANGED' },
        { status: 409 }
      );
    }

    // Entsperre
    await base44.entities.Lernpakete.update(lernpaketId, {
      is_locked: false,
      locked_by_email: null,
      locked_at: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[releaseLockSimple] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});