import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * forceReleaseLockAdmin
 * 
 * Nur für Admins: Entsperrt ein Lernpaket erzwungenermaßen.
 * Keine Prüfung, wem der Lock gehört.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-Check
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { lernpaketId } = await req.json();

    if (!lernpaketId) {
      return Response.json({ error: 'lernpaketId required' }, { status: 400 });
    }

    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Force release (kein Check)
    await base44.entities.Lernpakete.update(lernpaketId, {
      is_locked: false,
      locked_by_email: null,
      locked_at: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('[forceReleaseLockAdmin] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});