/**
 * lib/inspirationConstants.js
 *
 * Frontend-Single-Source-of-Truth für die Material-Level-Skala.
 *
 * WICHTIG: Material-Einsatz ist aus LEHRER-Sicht zu verstehen — also wie viel
 * Material die Lehrkraft zusätzlich zur Aufgabenstellung beschaffen/erstellen
 * muss, damit die Schüler die Aufgabe bearbeiten können (NICHT, wie viel die
 * Schüler selbst an Material brauchen).
 *
 * Spiegelt die Backend-Definitionen aus functions/generateTaskProposal.js und
 * functions/generateInspirationProposal.js — bei Änderungen bitte synchron
 * halten.
 */

export const MATERIAL_LEVELS = Object.freeze([
  {
    value: 0,
    label: 'Kein Material',
    short: 'Aufgabe steht für sich',
    hint: 'Die Aufgabe ist ohne weitere Materialzugaben lösbar — kein zusätzlicher Text, keine Grafik, kein Artikel nötig.',
    emoji: '🧠',
  },
  {
    value: 1,
    label: 'Minimal',
    short: 'Schnell zusammengesucht',
    hint: 'Die Lehrkraft muss noch eine Kleinigkeit beschaffen — z. B. einen passenden Zeitungsartikel, eine Grafik oder ein Bild aus dem Internet.',
    emoji: '🔎',
  },
  {
    value: 2,
    label: 'Moderat',
    short: 'Mehrere Materialien',
    hint: 'Es braucht mehrere Materialien, z. B. ein bis zwei Texte plus Grafik plus Originalquelle. Etwas mehr Vorbereitung durch die Lehrkraft.',
    emoji: '📚',
  },
  {
    value: 3,
    label: 'Aufwändig',
    short: 'Reale Materialien besorgen',
    hint: 'Die Lehrkraft muss Materialien aus der realen Welt besorgen — z. B. Kochlöffel, Duplo-Steine, Versuchsmaterial. Nicht „mal eben" zu beschaffen.',
    emoji: '🧰',
  },
]);

export const DEFAULT_MATERIAL_LEVEL = 1;

export function getMaterialLevel(value) {
  return MATERIAL_LEVELS.find((m) => m.value === value) || MATERIAL_LEVELS[DEFAULT_MATERIAL_LEVEL];
}