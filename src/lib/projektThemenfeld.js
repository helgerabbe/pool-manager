/**
 * Projekt-Themenfeld (2026-11-11): Jede Einheit hat genau ein festes
 * Themenfeld „Projektaufgaben" (Themenfeld.art = 'projekt'). Es steht immer
 * an letzter Stelle; die Lernpakete darin sind Projekt-Lernpakete.
 */
export const istProjektThemenfeld = (tf) => tf?.art === 'projekt';

/**
 * Kennzeichnet die Lernpakete des Projekt-Themenfelds mit `ist_projekt: true`.
 * Der Arbeitsplan erkennt daran, dass sie in den Projektbereich gehören.
 */
export function mitProjektKennzeichen(lernpakete = [], themenfelder = []) {
  const ids = new Set((themenfelder || []).filter(istProjektThemenfeld).map((tf) => tf.id));
  if (ids.size === 0) return lernpakete || [];
  return (lernpakete || []).map((lp) => (ids.has(lp.themenfeld_id) ? { ...lp, ist_projekt: true } : lp));
}