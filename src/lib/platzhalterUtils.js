/**
 * platzhalterUtils.js
 *
 * Single Source of Truth für die Erkennung und das Styling von
 * "Platzhalter"-System-Bausteinen (Magic-Raster, Phase 1).
 *
 * Ein Platzhalter ist technisch ein normaler System-Baustein
 * (`type: 'system'`), dessen `baustein_id` mit dem festen Präfix
 * `sys_platzhalter_` beginnt. Optisch wird er als gestrichelte Drop-Zone
 * dargestellt, um den Aufforderungscharakter ("hier muss noch eine
 * echte Aufgabe rein") zu transportieren.
 *
 * Wichtig: Die Komponenten lesen `baustein.baustein_id`. Das DB-Feld
 * heißt `baustein_id` (siehe Entität SystemBausteine), nicht `id`.
 * Die Helper akzeptieren defensiv beide Schreibweisen, damit auch
 * Test-Fixtures mit `id: '...'` funktionieren.
 */

export const PLATZHALTER_PREFIX = 'sys_platzhalter_';

/**
 * Liefert die effektive Baustein-ID. Bevorzugt das DB-Feld
 * `baustein_id`, fällt aber auf `id` zurück (für Tests/Fixtures).
 */
function resolveBausteinId(baustein) {
  if (!baustein || typeof baustein !== 'object') return '';
  return baustein.baustein_id || baustein.id || '';
}

/**
 * Prüft, ob ein System-Baustein-Datensatz ein Platzhalter ist.
 * Akzeptiert sowohl das Entitäts-Objekt als auch einen reinen String.
 */
export function isPlatzhalterBaustein(bausteinOrId) {
  if (!bausteinOrId) return false;
  const id = typeof bausteinOrId === 'string' ? bausteinOrId : resolveBausteinId(bausteinOrId);
  return typeof id === 'string' && id.startsWith(PLATZHALTER_PREFIX);
}

/**
 * Tailwind-Klassen für die gestrichelte Drop-Zone-Optik.
 * Wird in beiden Pill-Komponenten (Pool + Sektor) wiederverwendet.
 *
 * Hinweis: Wir setzen explizit `border-2`, damit der gestrichelte Rand
 * sichtbar ist (Standard-`border` von shadcn ist 1px und wirkt mit
 * `dashed` zu zart).
 */
export const PLATZHALTER_CLASSES = {
  // Container (Pool-Karte / Sektor-Pill)
  container:
    'border-dashed border-2 border-blue-400 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-500',
  // Container im selektierten Zustand
  containerSelected: 'border-dashed border-2 border-blue-500 bg-blue-100/70 shadow-sm',
  // Icon-Box (kleines Quadrat mit dem Lucide-Icon)
  iconBox: 'bg-blue-100',
  // Icon selbst
  icon: 'text-blue-700',
  // Titel-Text
  title: 'text-blue-800',
  // ID-Text (Pool-Karte)
  subtitle: 'text-blue-500',
};