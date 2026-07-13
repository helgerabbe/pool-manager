/**
 * setEinheitSichtbarkeitSecure
 *
 * Einziger erlaubter Weg, die Sichtbarkeit einer Einheit zu ändern
 * (Privat-Modus-Konzept 2026-07-13).
 *
 * - 'oeffentlich' (Veröffentlichen): darf nur der Besitzer der privaten
 *   Einheit oder ein Administrator. besitzer_email bleibt als
 *   Herkunftsnachweis erhalten.
 * - 'privat': darf nur ein Administrator (z. B. um eine versehentlich
 *   veröffentlichte Einheit zurückzuziehen); Besitzer wird dabei gesetzt,
 *   falls noch keiner existiert.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitId = payload?.einheit_id;
    const sichtbarkeit = payload?.sichtbarkeit;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });
    if (!['oeffentlich', 'privat'].includes(sichtbarkeit)) {
      return Response.json({ error: 'Ungültige Sichtbarkeit' }, { status: 400 });
    }

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    const benutzerList = await e.Benutzer.filter({ user_id: user.email });
    const istAdmin = user.role === 'admin' || benutzerList?.[0]?.rolle === 'Administrator';
    const istBesitzer = einheit.besitzer_email === user.email;

    if (sichtbarkeit === 'oeffentlich') {
      if (!istBesitzer && !istAdmin) {
        return Response.json({ error: 'Nur der Besitzer oder ein Administrator darf diese Einheit veröffentlichen' }, { status: 403 });
      }
    } else if (!istAdmin) {
      return Response.json({ error: 'Nur Administratoren dürfen eine Einheit auf privat stellen' }, { status: 403 });
    }

    const patch = { sichtbarkeit };
    if (sichtbarkeit === 'privat' && !einheit.besitzer_email) {
      patch.besitzer_email = user.email;
    }
    await e.Einheiten.update(einheitId, patch);

    await e.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Einheiten',
      resource_id: einheitId,
      changes: {
        action_code: 'SET_SICHTBARKEIT',
        von: einheit.sichtbarkeit || 'oeffentlich',
        nach: sichtbarkeit,
        titel_der_einheit: einheit.titel_der_einheit,
      },
      status: 'success',
    });

    return Response.json({ success: true, sichtbarkeit });
  } catch (error) {
    console.error('[setEinheitSichtbarkeitSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});