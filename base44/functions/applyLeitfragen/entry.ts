import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * Lernlandkarte, Etappe 0: Übernimmt die von der Administration gesichteten
 * Leitfragen in die Datenbank — Themenfeld.leitfrage und
 * Lernziele.schueler_uebersetzung.
 *
 * Payload:
 *   { themenfelder: [{id, leitfrage}], lernziele: [{id, schueler_uebersetzung}] }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Nur Administratoren.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const themenfelder = Array.isArray(body.themenfelder) ? body.themenfelder : [];
    const lernziele = Array.isArray(body.lernziele) ? body.lernziele : [];
    const svc = base44.asServiceRole.entities;

    let tfAnzahl = 0;
    for (const tf of themenfelder) {
      const text = String(tf.leitfrage || '').trim();
      if (!tf.id || !text) continue;
      await svc.Themenfeld.update(tf.id, { leitfrage: text });
      tfAnzahl += 1;
    }

    let lzAnzahl = 0;
    for (const lz of lernziele) {
      const text = String(lz.schueler_uebersetzung || '').trim();
      if (!lz.id || !text) continue;
      await svc.Lernziele.update(lz.id, { schueler_uebersetzung: text });
      lzAnzahl += 1;
    }

    return Response.json({ ok: true, themenfelder: tfAnzahl, lernziele: lzAnzahl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}