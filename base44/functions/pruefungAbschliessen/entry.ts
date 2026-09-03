/**
 * pruefungAbschliessen
 *
 * Schließt einen Prüflauf ab: räumt Befunde auf, die in diesem Lauf NICHT mehr
 * gefunden wurden, und schreibt die Zähler.
 *
 *   · war 'offen', nicht mehr gefunden   → Befund entfällt (Stelle ist in Ordnung)
 *   · war 'behoben', nicht mehr gefunden → Behebung wird bestätigt
 *   · war 'bewusst'                      → bleibt unangetastet
 *
 * Aufgeräumt wird nur, was dieser Lauf auch geprüft hat: Befunde anderer
 * Herkunft (KI-Stufe, MBK-Rückmeldung) bleiben unberührt, und bei einem
 * Delta-Lauf bleiben Stellen außerhalb des Umfangs erhalten.
 *
 * Payload: { prueflauf_id }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';
import { ladeBefunde } from '../../shared/pruefungBefunde.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const prueflaufId = body?.prueflauf_id;
    if (!prueflaufId) return Response.json({ error: 'prueflauf_id fehlt' }, { status: 400 });

    const lauf = await base44.asServiceRole.entities.Prueflauf.get(prueflaufId);
    if (!lauf) return Response.json({ error: 'Prüflauf nicht gefunden' }, { status: 404 });
    const einheit = await base44.asServiceRole.entities.Einheiten.get(lauf.einheit_id);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
      return Response.json({ error: 'Keine Berechtigung für die Prüfung' }, { status: 403 });
    }

    const jetzt = new Date().toISOString();
    const alle = await ladeBefunde(base44, lauf.einheit_id);
    const geprueft = new Set(Array.isArray(lauf.stufen) ? lauf.stufen : ['regel']);
    const startZeit = new Date(lauf.gestartet_am || 0).getTime();

    const inDiesemLauf = (b) =>
      b.zuletzt_gefunden_am && new Date(b.zuletzt_gefunden_am).getTime() >= startZeit;

    // Kandidaten fürs Aufräumen: von diesem Lauf abgedeckte Herkunft, aber
    // nicht (mehr) gefunden. Bei Delta-Läufen bleibt alles stehen, was der Lauf
    // nicht angefasst hat — dort ist „nicht gefunden" keine Aussage.
    const veraltet = lauf.umfang === 'delta'
      ? []
      : alle.filter((b) => geprueft.has(b.quelle || 'regel') && !inDiesemLauf(b));

    const zuLoeschen = veraltet.filter((b) => b.entscheidung === 'offen' || !b.entscheidung);
    const zuBestaetigen = veraltet.filter((b) => b.entscheidung === 'behoben' && !b.bestaetigt_behoben_am);

    for (const b of zuLoeschen) {
      await base44.asServiceRole.entities.Pruefbefund.delete(b.id);
    }
    if (zuBestaetigen.length > 0) {
      await base44.asServiceRole.entities.Pruefbefund.bulkUpdate(
        zuBestaetigen.map((b) => ({ id: b.id, bestaetigt_behoben_am: jetzt }))
      );
    }

    const geloescht = new Set(zuLoeschen.map((b) => b.id));
    const rest = alle.filter((b) => !geloescht.has(b.id));
    const zaehle = (wert) => rest.filter((b) => (b.entscheidung || 'offen') === wert).length;

    await base44.asServiceRole.entities.Prueflauf.update(prueflaufId, {
      status: 'fertig',
      beendet_am: jetzt,
      schritte_erledigt: lauf.schritte_gesamt || lauf.schritte_erledigt || 0,
      aktueller_schritt: 'Prüfung abgeschlossen',
      anzahl_offen: zaehle('offen'),
      anzahl_behoben: zaehle('behoben'),
      anzahl_bewusst: zaehle('bewusst'),
      anzahl_bestaetigt: zuBestaetigen.length,
      anzahl_erneut: rest.filter((b) => b.erneut_gefunden === true && b.entscheidung === 'offen').length,
    });

    return Response.json({
      ok: true,
      anzahl_offen: zaehle('offen'),
      anzahl_behoben: zaehle('behoben'),
      anzahl_bewusst: zaehle('bewusst'),
      entfallen: zuLoeschen.length,
      bestaetigt: zuBestaetigen.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}