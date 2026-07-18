/**
 * setEinheitAustauschSecure
 *
 * Austausch-Bibliothek (2026-07-18): Einziger erlaubter Weg, eine PRIVATE
 * Einheit für das Kollegium freizugeben (im_austausch=true) oder die
 * Freigabe zurückzuziehen (im_austausch=false).
 *
 * Berechtigt: der Besitzer der privaten Einheit oder ein Administrator.
 * Öffentliche (Poolzeit-)Einheiten können nicht in den Austausch — sie sind
 * ohnehin für alle sichtbar.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitId = payload?.einheit_id;
    const imAustausch = payload?.im_austausch === true;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    if (einheit.sichtbarkeit !== 'privat') {
      return Response.json({ error: 'Nur private Einheiten können in die Austausch-Bibliothek freigegeben werden' }, { status: 400 });
    }

    const benutzerList = await e.Benutzer.filter({ user_id: user.email });
    const istAdmin = user.role === 'admin' || benutzerList?.[0]?.rolle === 'Administrator';
    const istBesitzer = einheit.besitzer_email === user.email;

    if (!istBesitzer && !istAdmin) {
      return Response.json({ error: 'Nur der Besitzer oder ein Administrator darf die Freigabe ändern' }, { status: 403 });
    }

    await e.Einheiten.update(einheitId, { im_austausch: imAustausch });

    await e.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Einheiten',
      resource_id: einheitId,
      changes: {
        action_code: 'SET_AUSTAUSCH',
        im_austausch: imAustausch,
        titel_der_einheit: einheit.titel_der_einheit,
      },
      status: 'success',
    });

    return Response.json({ success: true, im_austausch: imAustausch });
  } catch (error) {
    console.error('[setEinheitAustauschSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});