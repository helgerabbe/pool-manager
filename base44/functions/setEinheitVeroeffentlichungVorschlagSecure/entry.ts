/**
 * setEinheitVeroeffentlichungVorschlagSecure
 *
 * Vorschlags-Workflow (2026-07-22): Besitzer einer PRIVATEN Einheit schlagen
 * sie der Fachschaftsleitung "zur Veröffentlichung als Poolzeit-Einheit" vor.
 *
 * - vorgeschlagen=true: darf der Besitzer der privaten Einheit oder ein
 *   Administrator. Nur für private Einheiten (kein Basismodul).
 * - vorgeschlagen=false (Zurückziehen/Ablehnen): darf der Besitzer, die
 *   zuständige Fachschaftsleitung oder ein Administrator.
 *
 * Die eigentliche Freigabe zur Poolzeit-Einheit läuft weiterhin ausschließlich
 * über setEinheitSichtbarkeitSecure (inkl. Freigabe-Reset auf 'draft').
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitId = payload?.einheit_id;
    const vorgeschlagen = payload?.vorgeschlagen === true;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (einheit.sichtbarkeit !== 'privat') {
      return Response.json({ error: 'Nur private Einheiten können zur Veröffentlichung vorgeschlagen werden' }, { status: 400 });
    }
    if (einheit.ist_basismodul === true) {
      return Response.json({ error: 'Basismodule können nicht als Poolzeit-Einheit vorgeschlagen werden' }, { status: 400 });
    }

    const benutzerList = await e.Benutzer.filter({ user_id: user.email });
    const benutzer = benutzerList?.[0];
    const istAdmin = user.role === 'admin' || benutzer?.rolle === 'Administrator';
    const istBesitzer = einheit.besitzer_email === user.email;
    const istFachschaftImFach =
      benutzer?.rolle === 'Fachschaftsleitung' &&
      (benutzer?.fachbereich_zustaendigkeit || []).includes(einheit.fach);

    if (vorgeschlagen) {
      if (!istBesitzer && !istAdmin) {
        return Response.json({ error: 'Nur der Besitzer der Einheit oder Administratoren dürfen sie zur Veröffentlichung vorschlagen' }, { status: 403 });
      }
    } else if (!istBesitzer && !istAdmin && !istFachschaftImFach) {
      return Response.json({ error: 'Nur Besitzer, zuständige Fachschaftsleitung oder Administratoren dürfen den Vorschlag zurückziehen' }, { status: 403 });
    }

    await e.Einheiten.update(einheitId, {
      zur_veroeffentlichung_vorgeschlagen: vorgeschlagen,
      vorgeschlagen_von: vorgeschlagen ? user.email : null,
      vorgeschlagen_am: vorgeschlagen ? new Date().toISOString() : null,
    });

    await e.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Einheiten',
      resource_id: einheitId,
      changes: {
        action_code: vorgeschlagen ? 'VORSCHLAG_VEROEFFENTLICHUNG' : 'VORSCHLAG_ZURUECKGEZOGEN',
        titel_der_einheit: einheit.titel_der_einheit,
      },
      status: 'success',
    });

    return Response.json({ success: true, vorgeschlagen });
  } catch (error) {
    console.error('[setEinheitVeroeffentlichungVorschlagSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});