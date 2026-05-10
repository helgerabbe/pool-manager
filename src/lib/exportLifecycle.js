/**
 * exportLifecycle.js
 *
 * Single Source of Truth für den vierstufigen Export-Workflow einer Einheit.
 *
 * Status (Frontend-Konstanten — Backend-Functions duplizieren diese Werte
 * inline, weil dort keine lokalen Imports erlaubt sind):
 *   - DRAFT             Einheit ist in Bearbeitung (Default).
 *   - FINAL_FREIGEGEBEN Schritt 3: Fachschaftsleitung hat alle 4 Dashboards
 *                       geprüft + Pre-Flight bestanden. Inhalte sind gesperrt.
 *                       Aufhebung durch Admin/Fachschaft möglich, solange das
 *                       Export-Team nicht 'Export starten' geklickt hat.
 *   - EXPORT_RUNNING    Schritt 4a: Export-Center hat 'Export starten'
 *                       ausgelöst. Aufhebung NUR noch im Export-Center
 *                       möglich, nicht mehr in der Einheit.
 *   - PUBLISHED         Schritt 4b: Manuelle Bestätigung 'In Moodle/Brian
 *                       veröffentlicht'. Beginn der Versionierung — geänderte
 *                       Aufgaben/Pakete/Sektoren werden ab jetzt als
 *                       'modified' markiert.
 *
 * Kernregel: alle Inhalte (Tab 3/4/5/6) sind read-only, sobald
 * `isContentLocked(status)` true liefert. Das Hauptmenü (Einheitenliste)
 * zeigt einen Badge, wenn `isVisuallyLocked(status)` true liefert.
 */

export const EXPORT_LIFECYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  FINAL_FREIGEGEBEN: 'final_freigegeben',
  EXPORT_RUNNING: 'export_running',
  PUBLISHED: 'published',
});

export const EXPORT_LIFECYCLE_VALUES = Object.freeze([
  EXPORT_LIFECYCLE_STATUS.DRAFT,
  EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN,
  EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING,
  EXPORT_LIFECYCLE_STATUS.PUBLISHED,
]);

/**
 * Sind die INHALTE der Einheit (Aufgaben, Lernpakete, Aktivitäten) gesperrt?
 * - Sobald die Einheit final freigegeben ist, dürfen Inhalte nicht mehr
 *   bearbeitet werden — bis Aufhebung oder Veröffentlichung.
 * - Im Zustand `published` ist die Einheit wieder editierbar (Versionierung
 *   greift); Änderungen markieren Items als 'modified'.
 */
export function isContentLocked(status) {
  return (
    status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN ||
    status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
  );
}

/**
 * Soll die Einheit in der Übersicht visuell als „gesperrt im Export"
 * markiert werden? (Badge in Einheitenliste etc.)
 */
export function isVisuallyLocked(status) {
  return isContentLocked(status);
}

/**
 * Darf in der Einheit (Tab 7) das „Freigabe aufheben" angeboten werden?
 * Nur solange das Export-Team noch nicht „Export starten" geklickt hat.
 * Nach `export_running` muss die Aufhebung im Export-Center passieren.
 */
export function canUndoFreigabeInUnit(status) {
  return status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN;
}

/**
 * Darf die Einheit aktuell „final freigegeben" werden?
 * Nur aus dem Draft-Zustand (alle anderen Zustände sind ein Übergang weiter).
 */
export function canEnterFinalFreigabe(status) {
  return !status || status === EXPORT_LIFECYCLE_STATUS.DRAFT;
}

/**
 * Lesefreundliche Labels für UI-Badges/Toasts.
 */
export const EXPORT_LIFECYCLE_LABELS = Object.freeze({
  [EXPORT_LIFECYCLE_STATUS.DRAFT]: 'In Bearbeitung',
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: 'Einheit final freigegeben',
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: 'Im Export',
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: 'In Moodle veröffentlicht',
});