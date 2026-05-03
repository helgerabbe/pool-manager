/**
 * lib/inspirationConstants.js
 *
 * Frontend-Single-Source-of-Truth für die Material-Level-Skala der
 * Inspiration-Engine (Phase 2 / PR5). Spiegelt die Backend-Definitionen
 * aus functions/generateInspirationProposal.js — bei Änderungen bitte
 * synchron halten.
 *
 * Genutzt im InspirationBriefingForm (Slider-Beschriftung) und in der
 * InspirationProposalCard (Anzeige des gewählten Levels).
 */

export const MATERIAL_LEVELS = Object.freeze([
  {
    value: 0,
    label: 'Kein Material',
    short: 'Rein kognitiv',
    hint: 'Denken, Sprechen, Schreiben — keine Gegenstände nötig.',
    emoji: '🧠',
  },
  {
    value: 1,
    label: 'Minimal',
    short: 'Stift & Heft',
    hint: '1–2 alltägliche Dinge, die jeder Schüler hat.',
    emoji: '✏️',
  },
  {
    value: 2,
    label: 'Moderat',
    short: 'Haushaltskram',
    hint: 'Mehrere Schul-/Haushaltsmaterialien — etwas Vorbereitung.',
    emoji: '🧰',
  },
  {
    value: 3,
    label: 'Aufwändig',
    short: 'Experimentier-Setup',
    hint: 'Mehrteiliger Versuchsaufbau, Klassenraum-tauglich.',
    emoji: '🔬',
  },
]);

export const DEFAULT_MATERIAL_LEVEL = 1;

export function getMaterialLevel(value) {
  return MATERIAL_LEVELS.find((m) => m.value === value) || MATERIAL_LEVELS[DEFAULT_MATERIAL_LEVEL];
}