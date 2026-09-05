/**
 * lernlandkarteEinschaetzung.js
 *
 * Die vierstufige Selbsteinschätzung der Lernlandkarte — eine einzige Quelle
 * für Reihenfolge, Beschriftung und Farbe (rot → grün). Der Knopf im
 * Inspektor schaltet mit jedem Klick eine Stufe weiter und danach zurück auf
 * „noch nicht eingeschätzt".
 */

export const STUFEN = [
  { wert: 'schwierig', label: 'Kein Plan, was das ist', kurz: 'Kein Plan', farbe: '#ef476f', anteil: 0 },
  { wert: 'unsicher', label: 'Hab ein bisschen verstanden', kurz: 'Ein bisschen', farbe: '#f77f00', anteil: 0.33 },
  { wert: 'teilweise', label: 'Kann das meiste', kurz: 'Das meiste', farbe: '#ffd166', anteil: 0.66 },
  { wert: 'sicher', label: 'Kann ich', kurz: 'Kann ich', farbe: '#06d6a0', anteil: 1 },
];

export const STUFEN_ANZAHL = STUFEN.length;

/** Stufen-Objekt zu einem gespeicherten Wert (oder null). */
export function stufeVon(wert) {
  return STUFEN.find((s) => s.wert === wert) || null;
}

/** Fortschrittsanteil (0–1) einer Einschätzung. */
export function anteilVon(wert) {
  return stufeVon(wert)?.anteil ?? 0;
}

/** 1-basierte Position der Stufe (für die Punkte am Knoten), 0 = nichts gesetzt. */
export function stufeIndex(wert) {
  const i = STUFEN.findIndex((s) => s.wert === wert);
  return i < 0 ? 0 : i + 1;
}

/** Nächste Stufe im Kreis: null → 1 → 2 → 3 → 4 → null. */
export function naechsteStufe(wert) {
  const i = STUFEN.findIndex((s) => s.wert === wert);
  if (i < 0) return STUFEN[0].wert;
  return i === STUFEN.length - 1 ? null : STUFEN[i + 1].wert;
}