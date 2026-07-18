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
    const benutzer = benutzerList?.[0];
    const istAdmin = user.role === 'admin' || benutzer?.rolle === 'Administrator';

    if (sichtbarkeit === 'oeffentlich') {
      // Poolzeit-Konzept (2026-07-18): privat → öffentlich macht die Einheit
      // zur Poolzeit-Einheit. Das dürfen NUR Administratoren und die
      // zuständige Fachschaftsleitung — nicht der Besitzer allein.
      const istFachschaftImFach =
        benutzer?.rolle === 'Fachschaftsleitung' &&
        (benutzer?.fachbereich_zustaendigkeit || []).includes(einheit.fach);
      if (!istAdmin && !istFachschaftImFach) {
        return Response.json({ error: 'Nur die zuständige Fachschaftsleitung oder Administratoren dürfen eine Einheit zur Poolzeit-Einheit machen' }, { status: 403 });
      }
    } else if (!istAdmin) {
      return Response.json({ error: 'Nur Administratoren dürfen eine Einheit auf privat stellen' }, { status: 403 });
    }

    const patch = { sichtbarkeit };
    if (sichtbarkeit === 'oeffentlich') {
      // Poolzeit-Einheiten stehen nicht (mehr) in der Austausch-Bibliothek.
      patch.im_austausch = false;
    }
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