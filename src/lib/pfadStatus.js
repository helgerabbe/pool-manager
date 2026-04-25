/**
 * pfadStatus.js
 *
 * Zentrale Konstanten für den Lebenszyklus eines Lernpfads.
 * Single Source of Truth für Magic-Strings, die zuvor in Hooks, UI und
 * Backend-Functions verteilt waren.
 *
 * WICHTIG für Backend-Functions:
 * Backend-Functions (functions/*) können diese Datei NICHT importieren
 * (Deno-Deploy-Constraint: keine lokalen Imports). Sie müssen die Werte
 * synchron halten – die Konstanten sind dort kommentiert markiert.
 */

export const PFAD_STATUS = Object.freeze({
  DRAFT: 'draft',
  LOCKED: 'locked_for_export',
  // 'empty' ist KEIN persistierter Status, sondern ein abgeleiteter
  // Frontend-Marker (siehe useLernpfadStatus): „es existiert noch keine
  // Membership für diesen (Einheit, Lerntyp)".
  EMPTY: 'empty',
});

/**
 * Status-Werte, die in der DB für `pfad_status` zulässig sind.
 * (EMPTY ist nur frontendseitig.)
 */
export const PFAD_STATUS_VALUES = Object.freeze([
  PFAD_STATUS.DRAFT,
  PFAD_STATUS.LOCKED,
]);

/**
 * Die vier Lerntyp-Keys. Reihenfolge entspricht der Tab-Anzeige im Architekt.
 */
export const LERNTYPEN = Object.freeze([
  'minimalist',
  'pragmatiker',
  'ehrgeizig',
  'passioniert',
]);

/**
 * Convenience-Check, ob ein Wert ein gültiger Lerntyp ist.
 */
export function isValidLerntyp(value) {
  return LERNTYPEN.includes(value);
}