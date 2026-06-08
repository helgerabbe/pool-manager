/**
 * lerntypen.js
 *
 * Single Source of Truth für die vier Lerntypen (Dashboards) in der
 * Schüleransicht. Schlüssel sind identisch mit den Keys in
 * Einheiten.lernpfade_konfiguration.
 */

export const LERNTYPEN = Object.freeze([
  {
    key: 'minimalist',
    name: 'Minimalist',
    untertitel: 'Klar, kompakt, das Wichtigste zuerst.',
    farbe: '#0ea5e9',
    icon: 'Feather',
  },
  {
    key: 'pragmatiker',
    name: 'Pragmatiker',
    untertitel: 'Effizient zum Ziel, ohne Umwege.',
    farbe: '#16a34a',
    icon: 'Target',
  },
  {
    key: 'ehrgeizig',
    name: 'Ehrgeizig',
    untertitel: 'Tiefer einsteigen, mehr erreichen.',
    farbe: '#9333ea',
    icon: 'Flame',
  },
  {
    key: 'passioniert',
    name: 'Passioniert',
    untertitel: 'Mit Begeisterung in die Tiefe.',
    farbe: '#e11d48',
    icon: 'Heart',
  },
]);

export function getLerntyp(key) {
  return LERNTYPEN.find((l) => l.key === key) || null;
}