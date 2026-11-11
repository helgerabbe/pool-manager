/**
 * ensureProjektThemenfeld
 * ───────────────────────
 * Jede Einheit hat genau EIN festes Themenfeld „Projektaufgaben"
 * (Themenfeld.art = 'projekt'). Diese Funktion legt es an, sobald eine
 * Einheit entsteht (Workflow auf Einheiten → create), und ist idempotent.
 * Übungsblöcke und Basismodule haben keine Projekte und bekommen keines.
 *
 * Aufruf: { einheit_id }. Nur für Administratoren (der Workflow läuft als Admin).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const einheitId = body?.einheit_id;
    if (!einheitId) return Response.json({ error: 'Missing einheit_id' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const einheit = await db.Einheiten.get(einheitId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });

    if (einheit.format === 'uebungsblock' || einheit.ist_basismodul === true) {
      return Response.json({ success: true, action: 'skipped' });
    }

    const vorhanden = await db.Themenfeld.filter({ einheit_id: einheitId, art: 'projekt' });
    if (vorhanden.length > 0) {
      return Response.json({ success: true, action: 'already_present', id: vorhanden[0].id });
    }

    const created = await db.Themenfeld.create({
      einheit_id: einheitId,
      titel: 'Projektaufgaben',
      art: 'projekt',
      reihenfolge: 9999,
    });
    return Response.json({ success: true, action: 'created', id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}