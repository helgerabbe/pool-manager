/**
 * convertEinheitZuBasismodulSecure
 *
 * Wandelt eine PRIVATE Einheit in ein BASISMODUL um (2026-07-22).
 *
 * Basismodule verfügen nur über Lernpakete — deshalb werden bei der
 * Umwandlung unwiderruflich entfernt:
 *  - ALLE Allgemeinen Aufgaben und Projektaufgaben (AllgemeineAufgabe)
 *    inkl. ihrer Lernziel-Mappings,
 *  - ALLE Lerntyp-Dashboards (lernpfade_konfiguration wird geleert,
 *    LernpfadAufgabeMembership-Einträge werden gelöscht).
 *
 * Berechtigung: wie beim Veröffentlichen zur Poolzeit-Einheit —
 * nur Administratoren oder die zuständige Fachschaftsleitung.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const einheitId = payload?.einheit_id;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });

    const e = base44.asServiceRole.entities;
    const einheit = await e.Einheiten.get(einheitId).catch(() => null);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (einheit.ist_basismodul === true) {
      return Response.json({ error: 'Diese Einheit ist bereits ein Basismodul' }, { status: 400 });
    }
    if (einheit.sichtbarkeit !== 'privat') {
      return Response.json({ error: 'Nur private Einheiten können in ein Basismodul umgewandelt werden' }, { status: 400 });
    }

    const benutzerList = await e.Benutzer.filter({ user_id: user.email });
    const benutzer = benutzerList?.[0];
    const istAdmin = user.role === 'admin' || benutzer?.rolle === 'Administrator';
    const istFachschaftImFach =
      benutzer?.rolle === 'Fachschaftsleitung' &&
      (benutzer?.fachbereich_zustaendigkeit || []).includes(einheit.fach);
    if (!istAdmin && !istFachschaftImFach) {
      return Response.json(
        { error: 'Nur die zuständige Fachschaftsleitung oder Administratoren dürfen eine Einheit zum Basismodul machen' },
        { status: 403 }
      );
    }

    // ── Allgemeine Aufgaben + Projektaufgaben inkl. Mappings entfernen ──
    const listAll = async (entity, query) => {
      const all = [];
      let skip = 0;
      while (true) {
        const page = await entity.filter(query, 'created_date', 500, skip);
        if (!page || page.length === 0) break;
        all.push(...page);
        if (page.length < 500) break;
        skip += 500;
      }
      return all;
    };

    const aufgaben = await listAll(e.AllgemeineAufgabe, { einheit_id: einheitId });
    const aufgabeIds = aufgaben.map((a) => a.id);

    // Mappings der gelöschten Aufgaben (Lernziele + Basis-Vorwissen) mitnehmen.
    for (let i = 0; i < aufgabeIds.length; i += 100) {
      const chunk = aufgabeIds.slice(i, i + 100);
      await e.AllgemeineAufgabeLernzielMapping.deleteMany({ aufgabe_id: { $in: chunk } });
      await e.AllgemeineAufgabeBasisLernzielMapping.deleteMany({ aufgabe_id: { $in: chunk } });
    }
    if (aufgabeIds.length > 0) {
      await e.AllgemeineAufgabe.deleteMany({ einheit_id: einheitId });
    }

    // ── Dashboards entfernen ──
    await e.LernpfadAufgabeMembership.deleteMany({ einheit_id: einheitId });

    await e.Einheiten.update(einheitId, {
      ist_basismodul: true,
      aus_basismodul: false,
      sichtbarkeit: 'oeffentlich',
      besitzer_email: einheit.besitzer_email || null, // bleibt als Herkunftsnachweis
      im_austausch: false,
      lernpfade_konfiguration: { minimalist: [], pragmatiker: [], ehrgeizig: [], passioniert: [] },
      dashboards_auto_status: {},
    });

    await e.AuditLog.create({
      user_email: user.email,
      action: 'UPDATE',
      resource_type: 'Einheiten',
      resource_id: einheitId,
      changes: {
        action_code: 'CONVERT_TO_BASISMODUL',
        titel_der_einheit: einheit.titel_der_einheit,
        geloeschte_aufgaben: aufgabeIds.length,
      },
      status: 'success',
    });

    return Response.json({ success: true, geloeschte_aufgaben: aufgabeIds.length });
  } catch (error) {
    console.error('[convertEinheitZuBasismodulSecure]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});