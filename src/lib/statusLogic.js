/**
 * statusLogic.js — Ampel-Logik für den Workspace
 *
 * Status-Werte:
 *   'red'    — Leer / kritisch unvollständig (kein Kind-Element vorhanden)
 *   'yellow' — In Bearbeitung (teilweise vorhanden, Lock aktiv, oder Alignment-Lücken)
 *   'green'  — Vollständig (Constructive Alignment erfüllt)
 */

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

function hatInhalt(aufgabe) {
  return aufgabe.aufgabentext_inhalt && aufgabe.aufgabentext_inhalt.trim() !== '';
}

function hatEbene2Felder(aufgabe) {
  return (
    hatInhalt(aufgabe) &&
    aufgabe.schwierigkeitsgrad &&
    aufgabe.schwierigkeitsgrad.trim() !== ''
  );
}

/**
 * Prüft ob eine Ebene-2-Aufgabe das Alignment-Minimum erfüllt:
 * Text + Sterne + mindestens 1 Mapping-Eintrag.
 *
 * @param {object}   aufgabe
 * @param {object[]} mappings — alle MappingAufgabeBasisziel-Datensätze (flat, alle Aufgaben)
 * @returns {'green'|'yellow'|'red'}
 */
export function getEbene2AufgabeStatus(aufgabe, mappings = []) {
  if (aufgabe.lock_status) return 'yellow'; // Gesperrt → immer gelb
  const hatFelder  = hatEbene2Felder(aufgabe);
  const hatMapping = mappings.some(m => m.aufgabe_id === aufgabe.id);
  if (hatFelder && hatMapping) return 'green';
  if (hatFelder || hatMapping) return 'yellow'; // Einer der beiden Teile fehlt
  return 'red';
}

/**
 * Gibt zurück, ob eine Ebene-2-Aufgabe Textinhalt hat, aber noch kein Mapping.
 * Wird in der Sidebar für die Warnmeldung verwendet.
 */
export function ebene2FehltMapping(aufgabe, mappings = []) {
  return (
    aufgabe.baustein_typ === 'Ebene-2-Aufgabe' &&
    hatInhalt(aufgabe) &&
    !mappings.some(m => m.aufgabe_id === aufgabe.id)
  );
}

/**
 * Berechnet den Ampel-Status eines einzelnen Aufgabenbausteins
 * (berücksichtigt Ebene-2-Mapping-Pflicht wenn mappings übergeben werden).
 *
 * @param {object}   aufgabe
 * @param {string}   userEmail
 * @param {object[]} mappings
 * @returns {'green'|'yellow'|'red'}
 */
export function getAufgabeStatus(aufgabe, userEmail, mappings = []) {
  if (aufgabe.lock_status && aufgabe.locked_by_user !== userEmail) return 'yellow';
  if (aufgabe.baustein_typ === 'Ebene-2-Aufgabe') {
    return getEbene2AufgabeStatus(aufgabe, mappings);
  }
  // Ebene 1 / alle anderen: Inhalt ODER Opt-Out = grün
  if (aufgabe.is_opt_out === true || hatInhalt(aufgabe)) return 'green';
  return 'red';
}

/**
 * Berechnet den Ampel-Status eines Lernziels.
 *
 * Logik:
 *  - Rot:    Keine Aufgabenbausteine vorhanden.
 *  - Gelb:   Aufgaben vorhanden, aber mind. eine ist nicht grün.
 *  - Grün:   Alle Bausteine sind grün (Ebene-2-Mapping-Pflicht inklusive).
 *
 * @param {object}   lernziel
 * @param {object[]} aufgaben
 * @param {string}   paketId
 * @param {string}   userEmail
 * @param {object[]} mappings  — MappingAufgabeBasisziel (optional, für Ebene-2-Prüfung)
 * @returns {'green'|'yellow'|'red'}
 */
export function getLernzielStatus(lernziel, aufgaben, paketId, userEmail = '', mappings = []) {
  const lzAufgaben = aufgaben.filter(
    a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id
  );

  if (lzAufgaben.length === 0) return 'red';

  const statusListe = lzAufgaben.map(a => getAufgabeStatus(a, userEmail, mappings));

  if (statusListe.every(s => s === 'green'))  return 'green';
  if (statusListe.some(s => s === 'red'))     return 'red';
  return 'yellow';
}

/**
 * Berechnet den Ampel-Status eines Lernpakets.
 *
 * - Rot:    Keine Lernziele vorhanden.
 * - Gelb:   Lernziele vorhanden, aber mindestens eines ist Gelb oder Rot.
 * - Grün:   Alle Lernziele sind Grün.
 *
 * @param {object}   paket
 * @param {object[]} lernziele
 * @param {object[]} aufgaben
 * @param {string}   userEmail
 * @returns {'green'|'yellow'|'red'}
 */
export function getLernpaketStatus(paket, lernziele, aufgaben, userEmail = '', mappings = []) {
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);

  if (paketZiele.length === 0) return 'red';

  const statusListe = paketZiele.map(lz =>
    getLernzielStatus(lz, aufgaben, paket.id, userEmail, mappings)
  );

  if (statusListe.every(s => s === 'green'))  return 'green';
  if (statusListe.some(s => s === 'red'))     return 'red';
  return 'yellow';
}

/**
 * Berechnet den Gesamt-Fortschritt einer Einheit als Prozentwert (0–100).
 * Basis: Anteil der "grünen" Lernpakete.
 *
 * @param {object[]} lernpakete
 * @param {object[]} lernziele
 * @param {object[]} aufgaben
 * @param {string}   userEmail
 * @returns {{ prozent: number, gruen: number, gesamt: number }}
 */
export function getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail = '', mappings = []) {
  const gesamt = lernpakete.length;
  if (gesamt === 0) return { prozent: 0, gruen: 0, gesamt: 0 };

  const gruen = lernpakete.filter(
    p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings) === 'green'
  ).length;

  return { prozent: Math.round((gruen / gesamt) * 100), gruen, gesamt };
}