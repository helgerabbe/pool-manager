/**
 * releaseLernpaketLockSecure.js
 * 
 * Gibt einen Lernpaket-Lock frei.
 * - Nur der Lock-Besitzer kann ihn freigeben
 * - Fallback: Admin kann auch fremde Locks aufheben
 * - Klare Fehlermeldungen
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Hole Lernpaket
    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Prüfe Besitz: Nur Lock-Besitzer oder Admin darf freigeben
    const isLockOwner = paket.is_locked && paket.locked_by_email === user.email;
    const isAdmin = user.role === 'admin';

    if (!isLockOwner && !isAdmin) {
      return Response.json(
        {
          error: `Sie haben diesen Lock nicht. Lock-Besitzer: ${paket.locked_by_email}`,
          locked_by_email: paket.locked_by_email,
          code: 'NOT_LOCK_OWNER',
        },
        { status: 403 }
      );
    }

    // Lock aufheben
    await base44.entities.Lernpakete.update(lernpaketId, {
      is_locked: false,
      locked_by_email: null,
      locked_at: null,
    });

    return Response.json({
      success: true,
      unlockedBy: user.email,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[releaseLernpaketLockSecure] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});