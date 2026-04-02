/**
 * stateMachine.js
 *
 * Phase 6.6: Status-Workflow State Machine
 *
 * Definiert erlaubte Status-Übergänge für Einheiten und andere Entities.
 * Verhindert ungültige Status-Transitionen.
 *
 * Workflow für Einheiten (freigabe_status):
 * "In Planung" → "Freigegeben für Moodle" → optional zurück
 */

// ── Status-Konstanten ────────────────────────────────────────────────────────
export const EINHEIT_STATUS = {
  IN_PLANUNG: 'In Planung',
  FREIGEGEBEN: 'Freigegeben für Moodle',
};

export const SYNC_STATUS = {
  NEW: 'new',
  EXPORTED: 'exported',
  MODIFIED: 'modified',
};

// ── Task Sync Status Config (für UI-Badges) ──────────────────────────────────
export const TASK_STATUS_CONFIG = {
  new: {
    label: 'Neu',
    color: 'text-blue-600',
  },
  exported: {
    label: 'Exportiert',
    color: 'text-green-600',
  },
  modified: {
    label: 'Geändert',
    color: 'text-amber-600',
  },
  pending_export: {
    label: 'Export ausstehend',
    color: 'text-orange-600',
  },
  to_delete: {
    label: 'Zu löschen',
    color: 'text-red-600',
  },
  approved: {
    label: 'Freigegeben',
    color: 'text-green-700',
  },
};

// ── State Machine: Erlaubte Übergänge ────────────────────────────────────────
/**
 * Definiert für jeden Status, welche anderen Stati er erreichen kann.
 * Format: { [currentStatus]: [allowedNextStates] }
 */
const TRANSITIONS = {
  [EINHEIT_STATUS.IN_PLANUNG]: [
    EINHEIT_STATUS.FREIGEGEBEN, // "In Planung" → "Freigegeben"
    // "In Planung" → "In Planung" (Selbst-Übergang erlaubt)
    EINHEIT_STATUS.IN_PLANUNG,
  ],
  [EINHEIT_STATUS.FREIGEGEBEN]: [
    EINHEIT_STATUS.IN_PLANUNG, // "Freigegeben" → zurück zu "In Planung"
    // "Freigegeben" → "Freigegeben" (Selbst-Übergang erlaubt)
    EINHEIT_STATUS.FREIGEGEBEN,
  ],
};

/**
 * Gibt alle erlaubten Ziel-Status für einen aktuellen Status zurück.
 *
 * @param {string} currentStatus - Aktueller Status (z.B. "In Planung")
 * @returns {Array<string>} Array erlaubter Ziel-Status
 *
 * @example
 * getAllowedTransitions("In Planung") // → ["In Planung", "Freigegeben für Moodle"]
 */
export function getAllowedTransitions(currentStatus) {
  return TRANSITIONS[currentStatus] || [];
}

/**
 * Prüft, ob ein Statusübergang erlaubt ist.
 *
 * @param {string} fromStatus - Aktueller Status
 * @param {string} toStatus - Ziel-Status
 * @returns {boolean} true wenn Übergang erlaubt
 *
 * @example
 * isValidTransition("In Planung", "Freigegeben für Moodle") // → true
 * isValidTransition("Freigegeben für Moodle", "Ungültig") // → false
 */
export function isValidTransition(fromStatus, toStatus) {
  const allowed = getAllowedTransitions(fromStatus);
  return allowed.includes(toStatus);
}

/**
 * Gibt den Status-Label für UI-Anzeige zurück.
 *
 * @param {string} status - Status-Wert
 * @returns {string} Anzeige-Label
 */
export function getStatusLabel(status) {
  return status || 'Unbekannt';
}

/**
 * Gibt die Badge-Farbe für einen Status zurück.
 *
 * @param {string} status - Status-Wert
 * @returns {string} Tailwind CSS Klasse
 */
export function getStatusColor(status) {
  switch (status) {
    case EINHEIT_STATUS.IN_PLANUNG:
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case EINHEIT_STATUS.FREIGEGEBEN:
      return 'bg-green-100 text-green-700 border-green-300';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

/**
 * Sync-Status Farben
 */
export function getSyncStatusColor(syncStatus) {
  switch (syncStatus) {
    case SYNC_STATUS.NEW:
      return 'bg-blue-100 text-blue-700';
    case SYNC_STATUS.EXPORTED:
      return 'bg-green-100 text-green-700';
    case SYNC_STATUS.MODIFIED:
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}