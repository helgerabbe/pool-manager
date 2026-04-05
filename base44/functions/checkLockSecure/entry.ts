import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * checkLockSecure
 * 
 * Prüft den aktuellen Lock-Status eines Lernpakets.
 * Gibt zurück: {is_locked, locked_by_email, locked_at}
 * 
 * Genutzt vom Frontend um zu entscheiden: Bearbeitungsmodus ja/nein?
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

    // Gebe Lock-Status zurück, Backend entscheidet nicht
    return Response.json({
      is_locked: paket.is_locked || false,
      locked_by_email: paket.locked_by_email || null,
      locked_at: paket.locked_at || null,
    });
  } catch (error) {
    console.error('[checkLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});