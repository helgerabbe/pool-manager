import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minuten

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, paket_id } = body;

  if (!paket_id || !action) {
    return Response.json({ error: 'paket_id und action sind erforderlich' }, { status: 400 });
  }

  const pakete = await base44.asServiceRole.entities.Lernpakete.filter({ id: paket_id });
  const paket = pakete?.[0];
  if (!paket) return Response.json({ error: 'Lernpaket nicht gefunden' }, { status: 404 });

  if (action === 'lock') {
    // Prüfe ob bereits gesperrt (und Lock noch gültig)
    if (paket.locked_by && paket.locked_by !== user.email) {
      const lockedAt = paket.locked_at ? new Date(paket.locked_at).getTime() : 0;
      const isExpired = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
      if (!isExpired) {
        return Response.json({
          success: false,
          locked_by: paket.locked_by,
          message: `Dieses Paket wird gerade von ${paket.locked_by} bearbeitet.`
        }, { status: 409 });
      }
    }
    // Lock setzen
    await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
      locked_by: user.email,
      locked_at: new Date().toISOString(),
    });
    return Response.json({ success: true, locked_by: user.email });
  }

  if (action === 'unlock') {
    // Nur der Lock-Inhaber oder ein Admin darf entsperren
    if (paket.locked_by && paket.locked_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Kein Zugriff' }, { status: 403 });
    }
    await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
      locked_by: null,
      locked_at: null,
    });
    return Response.json({ success: true });
  }

  if (action === 'heartbeat') {
    // Nur wenn der Lock dem aktuellen User gehört
    if (paket.locked_by !== user.email) {
      return Response.json({ error: 'Kein Lock vorhanden' }, { status: 403 });
    }
    await base44.asServiceRole.entities.Lernpakete.update(paket_id, {
      locked_at: new Date().toISOString(),
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Unbekannte Aktion' }, { status: 400 });
});