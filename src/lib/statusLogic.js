/**
 * statusLogic.js — Ampel-Logik für den Workspace
 *
 * Status-Werte:
 *   'red'    — Leer / kritisch unvollständig (kein Kind-Element vorhanden)
 *   'yellow' — In Bearbeitung (teilweise vorhanden, Lock aktiv, oder Alignment-Lücken)
 *   'green'  — Vollständig (Constructive Alignment erfüllt)
 */

// Baustein-Typen, die für ein vollständiges "Constructive Alignment" benötigt werden.
// Ein Lernziel gilt als grün, wenn mindestens einer aus jeder Pflichtgruppe vorhanden ist.
const PFLICHT_GRUPPEN = {
  rahmen:    ['Pre-Test', 'Input', 'Exit-Check'],
  niveau1:   ['Ebene-1-Übung'],
  niveau2:   ['Ebene-2-Aufgabe'],
  niveau3:   ['Ebene-3-Projekt'],
};

/**
 * Berechnet den Ampel-Status eines Aufgabenbausteins.
 * Gelb = gerade von einem anderen Nutzer gesperrt.
 *
 * @param {object} aufgabe
 * @param {string} userEmail — E-Mail des aktuellen Nutzers
 * @returns {'green'|'yellow'|'red'}
 */
export function getAufgabeStatus(aufgabe, userEmail) {
  if (aufgabe.lock_status && aufgabe.locked_by_user !== userEmail) return 'yellow';
  return 'green';
}

/**
 * Berechnet den Ampel-Status eines Lernziels.
 *
 * Logik:
 *  - Rot:    Keine Aufgabenbausteine vorhanden.
 *  - Gelb:   Aufgaben vorhanden, aber Constructive Alignment unvollständig
 *            ODER mindestens ein Baustein ist durch einen anderen Nutzer gesperrt.
 *  - Grün:   Mindestens ein Baustein pro Pflicht-Gruppe vorhanden UND kein fremder Lock.
 *
 * @param {object}   lernziel
 * @param {object[]} aufgaben — alle Aufgaben (gefiltert auf lernpaket_id + lernziel_id extern)
 * @param {string}   paketId
 * @param {string}   userEmail
 * @returns {'green'|'yellow'|'red'}
 */
export function getLernzielStatus(lernziel, aufgaben, paketId, userEmail = '') {
  const lzAufgaben = aufgaben.filter(
    a => a.lernpaket_id === paketId && a.lernziel_id === lernziel.id
  );

  // Rot: Keine Bausteine
  if (lzAufgaben.length === 0) return 'red';

  // Gelb: Fremder Lock vorhanden
  const hatFremdenLock = lzAufgaben.some(
    a => a.lock_status && a.locked_by_user !== userEmail
  );
  if (hatFremdenLock) return 'yellow';

  // Grün-Check: Constructive Alignment — mindestens ein Baustein aus jeder Pflicht-Gruppe?
  const vorhandeneTypen = new Set(lzAufgaben.map(a => a.baustein_typ));

  const hatRahmen  = PFLICHT_GRUPPEN.rahmen.some(t  => vorhandeneTypen.has(t));
  const hatNiveau1 = PFLICHT_GRUPPEN.niveau1.some(t => vorhandeneTypen.has(t));
  const hatNiveau2 = PFLICHT_GRUPPEN.niveau2.some(t => vorhandeneTypen.has(t));
  const hatNiveau3 = PFLICHT_GRUPPEN.niveau3.some(t => vorhandeneTypen.has(t));

  // Anforderungsebene des Lernziels bestimmt, welche Niveau-Bausteine erwartet werden
  const ebene = lernziel.anforderungsebene;
  let alignmentErfuellt = hatRahmen;
  if (ebene === 'Ebene 1 - Basis')    alignmentErfuellt = hatRahmen && hatNiveau1;
  if (ebene === 'Ebene 2 - Transfer') alignmentErfuellt = hatRahmen && hatNiveau1 && hatNiveau2;
  if (ebene === 'Ebene 3 - Projekt')  alignmentErfuellt = hatRahmen && hatNiveau1 && hatNiveau2 && hatNiveau3;

  return alignmentErfuellt ? 'green' : 'yellow';
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
export function getLernpaketStatus(paket, lernziele, aufgaben, userEmail = '') {
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === paket.id);

  if (paketZiele.length === 0) return 'red';

  const statusListe = paketZiele.map(lz =>
    getLernzielStatus(lz, aufgaben, paket.id, userEmail)
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
export function getEinheitFortschritt(lernpakete, lernziele, aufgaben, userEmail = '') {
  const gesamt = lernpakete.length;
  if (gesamt === 0) return { prozent: 0, gruen: 0, gesamt: 0 };

  const gruen = lernpakete.filter(
    p => getLernpaketStatus(p, lernziele, aufgaben, userEmail) === 'green'
  ).length;

  return { prozent: Math.round((gruen / gesamt) * 100), gruen, gesamt };
}