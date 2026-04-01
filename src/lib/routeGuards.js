import { ROLLEN } from '@/lib/rbac';

/**
 * Route-Guard Logik für Berechtigungsprüfung
 * 
 * Gibt Zugriff frei oder leitet um bei Mangel an Berechtigung.
 */

/**
 * Prüft ob ein Nutzer eine Einheit bearbeiten darf
 * @param {string} rolle - Nutzer-Rolle
 * @param {Array} faecher - Nutzer-Fachbereiche
 * @param {string} einheitFach - Fach der Einheit
 * @returns {boolean}
 */
export function canAccessEinheit(rolle, faecher, einheitFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT || rolle === ROLLEN.LEHRKRAFT) {
    return Array.isArray(faecher) && faecher.includes(einheitFach);
  }
  return false;
}

/**
 * Prüft ob ein Nutzer ein Basismodul bearbeiten darf
 * @param {string} rolle
 * @param {Array} faecher
 * @param {string} modulFach
 * @returns {boolean}
 */
export function canAccessBasismodul(rolle, faecher, modulFach) {
  if (rolle === ROLLEN.ADMIN) return true;
  if (rolle === ROLLEN.FACHSCHAFT || rolle === ROLLEN.LEHRKRAFT) {
    return Array.isArray(faecher) && faecher.includes(modulFach);
  }
  return false;
}

/**
 * Bestimmt die Redirect-URL basierend auf Rolle
 * @param {string} rolle
 * @returns {string}
 */
export function getDefaultRedirectPath(rolle) {
  if (rolle === ROLLEN.ADMIN || rolle === ROLLEN.FACHSCHAFT || rolle === ROLLEN.LEHRKRAFT) {
    return '/einheiten';
  }
  if (rolle === ROLLEN.MOODLE) {
    return '/moodle-export';
  }
  return '/';
}

/**
 * Gibt eine Read-Only-Ansicht für autorisierten, aber nicht schreibberechtigen Zugriff zurück
 * @param {string} rolle
 * @returns {Object} - { canView: boolean, canEdit: boolean }
 */
export function getAccessLevel(rolle, targetFach, userFaecher) {
  const canEdit = canAccessEinheit(rolle, userFaecher, targetFach);
  const canView = rolle !== ROLLEN.BETRACHTER; // Betrachter haben nur eingeschränkten Zugriff
  return { canView, canEdit };
}