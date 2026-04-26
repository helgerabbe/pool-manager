/**
 * ampelLogic.js
 *
 * Reine Helfer für das Ampel-System (Tab 7).
 * Single Source of Truth für die Status-Berechnung pro Lernpfad-Item.
 *
 * Statuswerte:
 *   - 'green'  : ready (approved, in sync)
 *   - 'yellow' : nach letztem Export verändert (sync_status === 'modified')
 *   - 'red'    : draft / unfertig
 *
 * Aggregations-Regel (rekursiv für Bündel/Projekt-Anker):
 *   MIN-Status der Kinder. Reihenfolge: red < yellow < green.
 *
 * Eingabe-Kontext (`ctx`) ist eine bereits geladene Map-Sammlung, damit
 * die UI keine N+1-Queries auslöst:
 *   - aufgabenById     : Map<aufgabe_id, AllgemeineAufgabe>
 *   - lernpaketeById   : Map<lernpaket_id, Lernpakete>
 */

import { ITEM_TYPE } from '@/lib/aufgabenTypen';

export const AMPEL = Object.freeze({
  GREEN: 'green',
  YELLOW: 'yellow',
  RED: 'red',
});

const RANK = { red: 0, yellow: 1, green: 2 };

function minStatus(a, b) {
  return RANK[a] <= RANK[b] ? a : b;
}

function aggregateMin(statuses, fallback = AMPEL.GREEN) {
  if (!statuses || statuses.length === 0) return fallback;
  return statuses.reduce((acc, s) => minStatus(acc, s), AMPEL.GREEN);
}

/**
 * "At-least-N-green"-Aggregation für `auswahl_buendel` (Brian-Bündel mit
 * X-von-Y-Auswahl).
 *
 * Logik:
 *   - requiredGreen <= 0 → wie aggregateMin (alle Kinder zählen → MIN-Regel).
 *   - Anzahl grüner Kinder >= requiredGreen → green.
 *   - Sonst, wenn (grün + gelb) >= requiredGreen → yellow
 *     (es gibt genug Kandidaten, aber mindestens einer wurde nach Export
 *     verändert; Lehrkraft soll noch einmal prüfen).
 *   - Andernfalls → red (zu wenig auswählbare Aufgaben fertig).
 *
 * Leere Kinderliste mit requiredGreen > 0 → red.
 */
function aggregateAtLeastNGreen(statuses, requiredGreen) {
  if (!Number.isFinite(requiredGreen) || requiredGreen <= 0) {
    return aggregateMin(statuses, AMPEL.RED);
  }
  const list = statuses || [];
  if (list.length === 0) return AMPEL.RED;

  let green = 0;
  let yellow = 0;
  for (const s of list) {
    if (s === AMPEL.GREEN) green += 1;
    else if (s === AMPEL.YELLOW) yellow += 1;
  }
  if (green >= requiredGreen) return AMPEL.GREEN;
  if (green + yellow >= requiredGreen) return AMPEL.YELLOW;
  return AMPEL.RED;
}

/**
 * Flacher Status einer einzelnen Aufgabe (ohne Rekursion).
 * Regeln:
 *   - content_status === 'approved' && sync_status === 'modified' → yellow
 *   - content_status === 'approved'                                → green
 *   - sonst                                                        → red
 *
 * Beachtet sowohl moodle_sync_status als auch das legacy sync_status-Feld.
 */
export function getFlatAufgabeStatus(aufgabe) {
  if (!aufgabe) return AMPEL.RED;
  const isApproved = aufgabe.content_status === 'approved';
  if (!isApproved) return AMPEL.RED;
  const isModified =
    aufgabe.moodle_sync_status === 'modified' ||
    aufgabe.brian_sync_status === 'modified' ||
    aufgabe.sync_status === 'modified';
  return isModified ? AMPEL.YELLOW : AMPEL.GREEN;
}

/**
 * Flacher Status eines Lernpakets (Ebene 1).
 * Container-Entitäten haben in dieser App `content_status: 'approved'` per default,
 * spiegeln Änderungen aber über sync_status === 'modified'.
 */
function getFlatLernpaketStatus(lernpaket) {
  if (!lernpaket) return AMPEL.RED;
  if (lernpaket.sync_status === 'modified') return AMPEL.YELLOW;
  if (lernpaket.content_status === 'approved') return AMPEL.GREEN;
  return AMPEL.RED;
}

/**
 * Status eines Lernpfad-Items (eine Zeile in einem Sektor).
 *
 * @param {{type:string, ref_id:string}} item   - Item aus dem Sektor.
 * @param {object} ctx                          - Vorab geladene Maps.
 * @param {Map} ctx.aufgabenById                - Alle Aufgaben der Einheit.
 * @param {Map} ctx.lernpaketeById              - Alle Lernpakete der Einheit.
 * @returns {'green'|'yellow'|'red'}
 */
export function getAmpelStatus(item, ctx = {}) {
  if (!item) return AMPEL.RED;

  // System-Bausteine sind reine Strukturmarker → immer grün.
  if (item.type === ITEM_TYPE.SYSTEM) return AMPEL.GREEN;

  const aufgabenById = ctx.aufgabenById || new Map();
  const lernpaketeById = ctx.lernpaketeById || new Map();

  const aufgabe = aufgabenById.get(item.ref_id);
  if (!aufgabe) return AMPEL.RED;

  const typ = aufgabe.aufgaben_typ || 'inhalt';

  // Inhalt / Prozess / Handlung: flache Prüfung.
  // Handlung ist eine handlungsorientierte Aufgabe ohne digitale Children
  // → identische Aggregation wie Inhalt/Prozess.
  if (typ === 'inhalt' || typ === 'prozess' || typ === 'handlung') {
    return getFlatAufgabeStatus(aufgabe);
  }

  // Bündel: rekursive Prüfung über verlinkte Lernpakete (Ebene 1).
  if (typ === 'buendel') {
    const ids = aufgabe.verlinkte_lernpaket_ids || [];
    if (ids.length === 0) return AMPEL.RED; // leeres Bündel = unvollständig
    const childStatuses = ids.map((id) => getFlatLernpaketStatus(lernpaketeById.get(id)));
    const childrenMin = aggregateMin(childStatuses);
    // Eigener Status der Bündel-Aufgabe darf nicht besser sein als Kinder.
    return minStatus(getFlatAufgabeStatus(aufgabe), childrenMin);
  }

  // Auswahl-Bündel (Brian-Bündel, X-von-Y): "at-least-N-green"-Aggregation.
  // erforderliche_anzahl === 0 ⇒ alle Kinder sind Pflicht (MIN-Regel).
  if (typ === 'auswahl_buendel') {
    const ids = aufgabe.verlinkte_aufgaben_ids || [];
    if (ids.length === 0) return AMPEL.RED; // leeres Bündel = unvollständig
    const required = Number.isFinite(aufgabe.erforderliche_anzahl)
      ? aufgabe.erforderliche_anzahl
      : 0;
    const childStatuses = ids.map((id) => getFlatAufgabeStatus(aufgabenById.get(id)));
    const childrenAgg = aggregateAtLeastNGreen(childStatuses, required);
    // Eigener Status der Bündel-Aufgabe darf nicht besser sein als Kinder-Aggregat.
    return minStatus(getFlatAufgabeStatus(aufgabe), childrenAgg);
  }

  // Projekt-Anker: rekursive Prüfung über verlinkte Ebene-3-Aufgaben.
  if (typ === 'projekt_anker') {
    const ids = aufgabe.verlinkte_projekt_ids || [];
    if (ids.length === 0) return AMPEL.RED;
    const childStatuses = ids.map((id) => getFlatAufgabeStatus(aufgabenById.get(id)));
    const childrenMin = aggregateMin(childStatuses);
    return minStatus(getFlatAufgabeStatus(aufgabe), childrenMin);
  }

  // Fallback (unbekannter Typ): wie inhalt behandeln.
  return getFlatAufgabeStatus(aufgabe);
}

/**
 * Liefert ein menschlich lesbares Label für die Tooltip-Anzeige.
 */
export function getAmpelLabel(status) {
  if (status === AMPEL.GREEN) return 'Bereit für Export';
  if (status === AMPEL.YELLOW) return 'Geändert seit letztem Export';
  return 'Noch nicht bereit (Entwurf)';
}