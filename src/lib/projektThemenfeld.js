/**
 * Projekt-Themenfeld (2026-11-11): Jede Einheit hat genau ein festes
 * Themenfeld „Projektaufgaben" (Themenfeld.art = 'projekt'). Es steht immer
 * an letzter Stelle; die Lernpakete darin sind Projekt-Lernpakete.
 */
export const istProjektThemenfeld = (tf) => tf?.art === 'projekt';