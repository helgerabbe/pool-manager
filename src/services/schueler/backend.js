/**
 * backend.js — Plattform-Weiche für den Schülerbereich.
 *
 * Liest die Build-Umgebungsvariable VITE_BACKEND und entscheidet, welcher
 * Adapter den SchuelerDataService bedient:
 *   - 'base44'   (Default): heutiger Betrieb auf Base44
 *   - 'supabase' : statischer Build (GitHub Pages) gegen Supabase
 *
 * Die Variable wird zur BUILD-Zeit eingebrannt (Vite), nicht zur Laufzeit
 * ermittelt. Im Base44-Editor/Preview ist sie nicht gesetzt → Default base44.
 */

const BACKEND = (import.meta.env?.VITE_BACKEND || 'base44').toLowerCase();

export function getBackendName() {
  return BACKEND;
}

export function isSupabase() {
  return BACKEND === 'supabase';
}

export function isBase44() {
  return !isSupabase();
}