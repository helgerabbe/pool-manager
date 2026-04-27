/**
 * sektorTypen.js
 *
 * Single Source of Truth für die semantischen Sektor-Typen (Phase A des
 * Epic „Semantische Dashboard-Sektoren"). Wird von Schema-Helpern,
 * Templates, Backfill-Function und der späteren UI (Phase B) genutzt.
 *
 * Architektur-Entscheidung (siehe Logbuch §19):
 *   - Sektor-Typ ist nach Anlage UNVERÄNDERLICH.
 *   - Singletons werden im UI hart durchgesetzt (Phase B).
 *   - Sektor-Modus (sequenziell/frei) wandert ans Bündel — `sektor.modus`
 *     bleibt aus Kompatibilitätsgründen im Schema, aber hart auf
 *     'sequenziell' fixiert.
 */

export const SEKTOR_TYP = Object.freeze({
  ONBOARDING: 'onboarding',
  UEBERBLICK: 'ueberblick',
  ARBEITSPHASE: 'arbeitsphase_themenfeld',
  ZWISCHENTEST: 'zwischentest',
  ABSCHLUSSTEST: 'abschlusstest',
  PROJEKTE: 'projekte',
  INDIVIDUELL: 'individuell',
});

export const ALL_SEKTOR_TYPEN = Object.freeze([
  SEKTOR_TYP.ONBOARDING,
  SEKTOR_TYP.UEBERBLICK,
  SEKTOR_TYP.ARBEITSPHASE,
  SEKTOR_TYP.ZWISCHENTEST,
  SEKTOR_TYP.ABSCHLUSSTEST,
  SEKTOR_TYP.PROJEKTE,
  SEKTOR_TYP.INDIVIDUELL,
]);

/**
 * Singleton-Typen: dürfen pro Lerntyp nur einmal vorkommen.
 * Wird in Phase B von der "Sektor hinzufügen"-UI hart durchgesetzt.
 */
export const SINGLETON_SEKTOR_TYPEN = Object.freeze([
  SEKTOR_TYP.ONBOARDING,
  SEKTOR_TYP.UEBERBLICK,
  SEKTOR_TYP.ABSCHLUSSTEST,
  SEKTOR_TYP.PROJEKTE,
]);

export const isSingletonSektorTyp = (typ) => SINGLETON_SEKTOR_TYPEN.includes(typ);

export const isValidSektorTyp = (typ) => ALL_SEKTOR_TYPEN.includes(typ);

/**
 * Default-Typ für unklassifizierte Sektoren (Backfill-Fallback und
 * Default für `createNewSektor`, wenn der Aufrufer keinen Typ angibt).
 */
export const DEFAULT_SEKTOR_TYP = SEKTOR_TYP.INDIVIDUELL;

/**
 * Bündel-Kind aus `accepted_types` ableiten. Single Source of Truth für die
 * Default-Modus-Logik (Phase C) und Auto-Befüllen (Phase D).
 *
 * Mapping (gemäß M4-Backfill in migrateLernpfadeToInstanceIds):
 *   accepted_types=['lernpaket']       → 'lernpakete'
 *   accepted_types=['auswahl_buendel'] → 'aufgaben'
 *   accepted_types=['projekt']         → 'projekte'
 *
 * Liefert null, wenn kein Match (defensiver Default).
 */
export function getBundleKindByAcceptedTypes(acceptedTypes) {
  if (!Array.isArray(acceptedTypes) || acceptedTypes.length === 0) return null;
  if (acceptedTypes.includes('lernpaket')) return 'lernpakete';
  if (acceptedTypes.includes('auswahl_buendel')) return 'aufgaben';
  if (acceptedTypes.includes('projekt')) return 'projekte';
  return null;
}

/**
 * Default-Modus für ein Bündel (Phase C):
 *   - lernpakete → sequenziell (Moodle-Flow)
 *   - aufgaben   → frei (X von Y)
 *   - projekte   → frei (immer, hart kodiert in der UI als disabled)
 *
 * Liefert 'frei' als sicheren Fallback, wenn der Bündel-Kind unklar ist.
 */
export function getDefaultBundleModus(bundleKind) {
  if (bundleKind === 'lernpakete') return 'sequenziell';
  return 'frei';
}

/**
 * Liefert true, wenn der Bündel-Modus von der Lehrkraft veränderbar sein
 * soll. Projekt-Bündel sind hart auf 'frei' fixiert (siehe UI-Tooltip in
 * Phase C).
 */
export function isBundleModusEditable(bundleKind) {
  return bundleKind === 'lernpakete' || bundleKind === 'aufgaben';
}