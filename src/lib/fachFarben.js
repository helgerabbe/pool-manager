/**
 * Hilfsfunktionen für dynamische Fach-Farben aus LookupFaecher.
 *
 * Fallback-Farben (werden verwendet, wenn kein LookupFaecher-Eintrag
 * mit einer gesetzten Farbe gefunden wird).
 */

const FALLBACK_COLORS = {
  Deutsch:      '#ef4444',
  Mathematik:   '#3b82f6',
  Englisch:     '#eab308',
  Französisch:  '#a855f7',
  Latein:       '#f43f5e',
  Biologie:     '#22c55e',
  Chemie:       '#f97316',
  Physik:       '#06b6d4',
  Geschichte:   '#f59e0b',
  Geographie:   '#14b8a6',
  Politik:      '#64748b',
  Wirtschaft:   '#10b981',
  Kunst:        '#ec4899',
  Musik:        '#8b5cf6',
  Sport:        '#84cc16',
  Religion:     '#0ea5e9',
  Ethik:        '#d946ef',
  Informatik:   '#6366f1',
};

/**
 * Gibt den Hex-Farbwert für ein Fach zurück.
 * @param {string} fachName - Name des Fachs
 * @param {Array}  faecher  - Array von LookupFaecher-Objekten (mit .name und .farbe)
 * @returns {string} Hex-Farbcode
 */
export function getFachFarbe(fachName, faecher = []) {
  const found = faecher.find(f => f.name === fachName);
  if (found?.farbe) return found.farbe;
  return FALLBACK_COLORS[fachName] || '#94a3b8';
}

/**
 * Gibt Tailwind-kompatible Inline-Style-Props für einen Badge zurück.
 * Hintergrund = Farbe mit 15% Opazität, Text = Farbe.
 * @param {string} hex - Hex-Farbcode
 * @returns {{ backgroundColor: string, color: string, borderColor: string }}
 */
export function getFachBadgeStyle(hex) {
  return {
    backgroundColor: hex + '26', // ~15% Opazität
    color: hex,
    borderColor: hex + '55',
  };
}