/**
 * pruefungStarten
 *
 * Startet einen Prüflauf der Export-Vorprüfung (Prüfbereich Tab 8) für eine
 * GEMEINSCHAFTLICHE Einheit und liefert die Liste der Prüfschritte zurück.
 * Die Schritte werden anschließend einzeln über `pruefungSchritt` abgearbeitet —
 * so kann die Oberfläche einen echten Fortschritt anzeigen.
 *
 * Payload: { einheit_id, umfang?: 'voll'|'delta', stufen?: ['regel'|'ki'] }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasPruefungLeitungAccess } from '../../shared/pruefungAccess.js';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const einheitId = body?.einheit_id;
    const umfang = body?.umfang === 'delta' ? 'delta' : 'voll';
    const stufen = Array.isArray(body?.stufen) && body.stufen.length > 0 ? body.stufen : ['regel'];
    if (!einheitId) return Response.json({ error: 'einheit_id fehlt' }, { status: 400 });

    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) return Response.json({ error: 'Einheit nicht gefunden' }, { status: 404 });
    if (einheit.sichtbarkeit !== 'oeffentlich' || einheit.ist_basismodul === true || einheit.format === 'uebungsblock') {
      return Response.json(
        { error: 'Die Prüfung steht derzeit nur für gemeinschaftliche Poolzeit-Einheiten zur Verfügung.' },
        { status: 400 }
      );
    }

    if (!(await hasPruefungLeitungAccess(base44, user, einheit))) {
      return Response.json(
        { error: 'Nur Fachschaftsleitung, benannte Einheits-Leitung oder Administratoren dürfen die Prüfung starten.' },
        { status: 403 }
      );
    }

    const [lernpakete, aufgaben] = await Promise.all([
      base44.asServiceRole.entities.Lernpakete.filter({ einheit_id: einheitId }),
      base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    ]);

    const aktivePakete = (lernpakete || [])
      .filter((lp) => lp.sync_status !== 'to_delete')
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
    const aktiveAufgaben = (aufgaben || []).filter((aa) => aa.sync_status !== 'to_delete');

    const schritte = [
      ...aktivePakete.map((lp) => ({
        typ: 'lernpaket',
        id: lp.id,
        titel: lp.titel_des_pakets || 'Lernpaket ohne Titel',
      })),
      ...aktiveAufgaben.map((aa) => ({
        typ: 'aufgabe',
        id: aa.id,
        titel: aa.titel || 'Aufgabe ohne Titel',
      })),
      // Ein Schritt für die vorab per KI erzeugten Seiten des Lernpfads
      // (z. B. Themenfeld-Einführungen). Fehlt der Inhalt, ist die Seite im
      // Kurs leer — der Arbeitsort ist das Export-Center.
      { typ: 'interne_inhalte', id: einheitId, titel: 'Interne KI-Inhalte' },
    ];

    const jetzt = new Date().toISOString();
    const lauf = await base44.asServiceRole.entities.Prueflauf.create({
      einheit_id: einheitId,
      gestartet_von: user.email,
      gestartet_am: jetzt,
      status: 'laeuft',
      umfang,
      stufen,
      schritte_gesamt: schritte.length,
      schritte_erledigt: 0,
      aktueller_schritt: schritte.length > 0 ? `Vorbereitung (0 von ${schritte.length})` : 'Nichts zu prüfen',
    });

    return Response.json({ prueflauf_id: lauf.id, gestartet_am: jetzt, schritte });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}