/**
 * statusLogic.js — Ampel-Logik für den Workspace (Atom-Modell)
 *
 * Modell:
 *   - Lernziele = atomare Basis-Bausteine (kein anforderungsebene mehr)
 *   - Aufgabenbausteine tragen die Ebene: "1 - Basis", "2 - Transfer", "3 - Projekt"
 *
 * Status-Werte:
 *   'red'    — Leer / kritisch unvollständig
 *   'yellow' — In Bearbeitung (teilweise vorhanden, Lock aktiv, Mapping fehlt)
 *   'green'  — Vollständig
 */

// ── Hilfsfunktionen ────────────────────────────────────────────────────────────

function hatInhalt(aufgabe) {
  return aufgabe.aufgabentext_inhalt && aufgabe.aufgabentext_inhalt.trim() !== '';
}

function istTransferOderProjekt(aufgabe) {
  return (
    aufgabe.anforderungsebene === '2 - Transfer' ||
    aufgabe.anforderungsebene === '3 - Projekt' ||
    // Rückwärtskompatibilität mit altem baustein_typ
    aufgabe.baustein_typ === 'Ebene-2-Aufgabe' ||
    aufgabe.baustein_typ === 'Ebene-3-Projekt'
  );
}

/**
 * Status einer Transfer/Projekt-Aufgabe:
 * Grün = Textinhalt vorhanden UND mindestens 1 Lernziel-Atom zugeordnet.
 */
export function getEbene2AufgabeStatus(aufgabe, mappings = []) {
  if (aufgabe.lock_status) return 'yellow';
  const hatText    = hatInhalt(aufgabe);
  const hatMapping = mappings.some(m => m.aufgabe_id === aufgabe.id);
  if (hatText && hatMapping) return 'green';
  if (hatText || hatMapping) return 'yellow';
  return 'red';
}

/**
 * Gibt zurück, ob eine Transfer-Aufgabe Textinhalt hat, aber noch kein Mapping.
 */
export function ebene2FehltMapping(aufgabe, mappings = []) {
  return (
    istTransferOderProjekt(aufgabe) &&
    hatInhalt(aufgabe) &&
    !mappings.some(m => m.aufgabe_id === aufgabe.id)
  );
}

/**
 * Status eines einzelnen Aufgabenbausteins.
 *
 * - Basis-Bausteine (1 - Basis): Inhalt ODER Opt-Out = grün
 * - Transfer/Projekt (2/3):      Inhalt + Mapping = grün
 */
export function getAufgabeStatus(aufgabe, userEmail, mappings = []) {
  if (aufgabe.lock_status && aufgabe.locked_by_user !== userEmail) return 'yellow';
  if (istTransferOderProjekt(aufgabe)) {
    return getEbene2AufgabeStatus(aufgabe, mappings);
  }
  // Basis-Baustein: Inhalt ODER Opt-Out = grün
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