/**
 * lib/aufgabeLernziele.js
 *
 * Beantwortet die Frage: WELCHE LERNZIELE bedient diese Aufgabe?
 *
 * Die Antwort steckt inzwischen an drei Orten, weil die Zuordnung zweimal
 * umgebaut wurde:
 *
 *   1. Mapping-Entity `AllgemeineAufgabeLernzielMapping` — der ursprüngliche
 *      Weg (Drag & Drop). Wird seit der Umstellung auf die KI-Analyse von
 *      NIEMANDEM mehr geschrieben, enthält aber Bestandsdaten.
 *   2. `aufgabe.lernzielanalyse.items` — die KI-Analyse an der Aufgabe.
 *      Der Weg der Einzelaufgaben.
 *   3. `schritt.brian.lernzielanalyse.items` — die KI-Analyse am Brian-Schritt.
 *      Der Weg seit dem Umbau auf Schrittfolgen (2026-08-31).
 *
 * Die Lernlandkarte las bis 2026-08-31 ausschliesslich Quelle 1. Jede Aufgabe,
 * die seit der Umstellung entstanden ist, fehlte dort deshalb — ohne
 * Fehlermeldung, weil die Karte ja gebaut wurde, nur unvollstaendig.
 *
 * Diese Funktion fasst alle drei zusammen. Sie ist bewusst additiv: Die alten
 * Mappings bleiben gueltig, damit Bestandsaufgaben ihre Zuordnung behalten und
 * keine Migration noetig ist. Laeuft eine alte Aufgabe einmal durch die
 * Analyse, kommt ihre Zuordnung aus dem Feld — die Mapping-Tabelle stirbt
 * dadurch von selbst aus, statt kuenstlich gepflegt zu werden.
 */

/** Lernziel-Kennungen aus einem Analyse-Block. */
function ausAnalyse(analyse) {
  const items = Array.isArray(analyse?.items) ? analyse.items : [];
  return items.map((it) => it?.lernziel_id).filter(Boolean);
}

/**
 * Alle Lernziel-Kennungen einer Aufgabe, aus allen drei Quellen.
 *
 * @param {object} aufgabe
 * @param {Array} mappings  Datensaetze aus AllgemeineAufgabeLernzielMapping
 * @returns {string[]} Kennungen, ohne Dubletten
 */
export function lernzieleDerAufgabe(aufgabe, mappings = []) {
  if (!aufgabe?.id) return [];
  const ids = new Set();

  // 1. Altbestand aus der Mapping-Tabelle
  (mappings || []).forEach((m) => {
    if (m?.aufgabe_id === aufgabe.id && m?.lernziel_id) ids.add(m.lernziel_id);
  });

  // 2. Analyse an der Aufgabe
  ausAnalyse(aufgabe.lernzielanalyse).forEach((id) => ids.add(id));

  // 3. Analyse an den Brian-Schritten
  const schritte = Array.isArray(aufgabe.sequenz_schritte) ? aufgabe.sequenz_schritte : [];
  schritte
    .filter((s) => s?.typ === 'brian')
    .forEach((s) => ausAnalyse(s.brian?.lernzielanalyse).forEach((id) => ids.add(id)));

  return [...ids];
}

/** Bedient diese Aufgabe das genannte Lernziel? */
export function aufgabeBedientLernziel(aufgabe, lernzielId, mappings = []) {
  if (!lernzielId) return false;
  return lernzieleDerAufgabe(aufgabe, mappings).includes(lernzielId);
}
