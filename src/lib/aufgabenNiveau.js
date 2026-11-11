/**
 * Niveau und Pflicht/Wahl einer Lernpaket-Aufgabe (2026-11-10).
 *
 * Das Niveau ersetzt die Sterne und regelt, in welchen Arbeitsplänen eine
 * Aufgabe erscheint:
 *   G  = Minimalist und Pragmatiker
 *   GE = alle
 *   E  = Ehrgeizig und Passioniert
 */
export const NIVEAU_STANDARD = 'GE';

export const NIVEAUS = [
  { value: 'G', label: 'G', title: 'Grundniveau: erscheint bei Minimalist und Pragmatiker' },
  { value: 'GE', label: 'GE', title: 'Erscheint in allen Arbeitsplänen' },
  { value: 'E', label: 'E', title: 'Erweitertes Niveau: erscheint bei Ehrgeizig und Passioniert' },
];

export const PFLICHT_WAHL = [
  { value: true, label: 'P', title: 'Pflicht: Schüler müssen diese Aufgabe bearbeiten' },
  { value: false, label: 'F', title: 'Freiwillig: Schüler können diese Aufgabe überspringen' },
];