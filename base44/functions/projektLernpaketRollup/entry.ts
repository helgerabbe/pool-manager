/**
 * projektLernpaketRollup
 *
 * Zieht Lernpakete.is_complete für PROJEKT-Lernpakete nach. Normale Lernpakete
 * rechnet der lernpaketAggregateGuardian aus ihren Aktivitäten; ein
 * Projekt-Lernpaket hat keine Aktivitäten, sein Stand ergibt sich aus seinen
 * Aufgaben (siehe shared/projektLernpaket.js).
 *
 * Aufruf: Workflow „Projekt-Lernpaket: Vollständigkeit nachziehen" bei jeder
 * Änderung einer Aufgabe, die in einem Lernpaket liegt oder lag.
 * Args: { lernpaket_id, vorher_lernpaket_id }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { projektPaketStand } from '../../shared/projektLernpaket.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const ids = [...new Set([body?.lernpaket_id, body?.vorher_lernpaket_id].filter(Boolean))];
    const entities = base44.asServiceRole.entities;
    const ergebnis = [];

    for (const id of ids) {
      const paket = await entities.Lernpakete.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      const stand = paket ? await projektPaketStand(entities, paket) : null;
      if (!stand) {
        ergebnis.push({ id, uebersprungen: true });
        continue;
      }
      const geaendert = paket.is_complete !== stand.vollstaendig;
      if (geaendert) await entities.Lernpakete.update(id, { is_complete: stand.vollstaendig });
      ergebnis.push({ id, is_complete: stand.vollstaendig, geaendert, aufgaben: stand.aufgaben.length });
    }

    return Response.json({ ok: true, ergebnis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}