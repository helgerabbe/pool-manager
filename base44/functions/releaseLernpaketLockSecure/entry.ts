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

    // Hole Lernpaket
    const paket = await base44.entities.Lernpakete.get(lernpaketId);

    if (!paket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Prüfe Besitz: Nur Lock-Besitzer oder Admin darf freigeben
    const isLockOwner = paket.is_locked && paket.locked_by_email === user.email;
    const profile = await base44.asServiceRole.entities.Benutzer.filter({ user_id: user.email });
    const isAdmin = user.role === 'admin' || profile?.[0]?.rolle === 'Administrator';

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

    // Best-effort OCC: Direkt vor dem Unlock erneut lesen und abbrechen,
    // wenn der Lock seit der ersten Prüfung übernommen/geändert wurde.
    const latestPaket = await base44.entities.Lernpakete.get(lernpaketId);
    if (!latestPaket) {
      return Response.json({ error: 'Lernpaket not found' }, { status: 404 });
    }

    // Self-Lockout-Fix 2026-06-10: KEIN Timestamp-Vergleich mehr.
    // Der Heartbeat (useLocks.js, alle 25 s) schreibt laufend ein neues
    // `locked_at` auf das eigene Lernpaket. Ein Vergleich gegen den vorher
    // gelesenen Timestamp schlug daher fast immer fehl → 409 LOCK_CHANGED →
    // der eigene Bearbeitungsmodus liess sich nicht mehr beenden (User blieb
    // dauerhaft ausgesperrt). Maßgeblich ist allein: Bin ICH noch der Owner?
    // Wenn ja, darf ich immer freigeben. Hat zwischenzeitlich JEMAND ANDERES
    // den Lock übernommen, brechen wir ab (sein Lock bleibt unangetastet).
    const lockTakenByOther =
      latestPaket.is_locked &&
      latestPaket.locked_by_email &&
      latestPaket.locked_by_email !== user.email &&
      !isAdmin;
    if (lockTakenByOther) {
      return Response.json(
        { error: 'Der Lock wurde zwischenzeitlich von einer anderen Person übernommen.', code: 'LOCK_CHANGED' },
        { status: 409 }
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