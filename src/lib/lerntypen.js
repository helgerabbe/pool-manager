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

/**
 * Privat-Modus (Stufe 1): Welche Lerntypen bietet diese Einheit an?
 * Öffentliche Einheiten bieten IMMER alle an; private Einheiten können
 * einzelne Lerntypen abwählen (Feld `aktive_lerntypen`).
 * Legacy-Fallback: der frühere Pauschal-Schalter `lerntypen_modus='einzel'`
 * entspricht nur ['ehrgeizig'].
 */
export function getAktiveLerntypKeys(einheit) {
  const alle = LERNTYPEN.map((l) => l.key);
  if (!einheit || einheit.sichtbarkeit !== 'privat') return alle;
  if (Array.isArray(einheit.aktive_lerntypen) && einheit.aktive_lerntypen.length > 0) {
    const gefiltert = alle.filter((k) => einheit.aktive_lerntypen.includes(k));
    if (gefiltert.length > 0) return gefiltert;
  }
  if (einheit.lerntypen_modus === 'einzel') return ['ehrgeizig'];
  return alle;
}