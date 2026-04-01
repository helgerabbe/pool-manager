/**
 * Erweiterte Structural Lock Logik für Phase 3
 * 
 * Härtet den Lock gegen Concurrency-Probleme aus und deaktiviert
 * sicherheitskritische Buttons für User B, wenn User A den Lock hält.
 */

const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min

/**
 * Prüft, ob eine Einheit aktuell strukturell gesperrt ist
 * (von jemand anderem)
 * 
 * @param {Object} einheit - Die Einheit-Entity
 * @param {string} currentUserEmail - E-Mail des aktuellen Nutzers
 * @returns {boolean}
 */
export function isStructurallyLocked(einheit, currentUserEmail) {
  if (!einheit?.structural_lock) return false;
  
  // User A (Lock-Besitzer) hat Schreibzugriff
  if (einheit.structural_lock === currentUserEmail) return false;
  
  // Lock-Timeout prüfen
  const lockedAt = einheit.structural_locked_at 
    ? new Date(einheit.structural_locked_at).getTime() 
    : 0;
  const isExpired = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
  
  return !isExpired;
}

/**
 * Gibt an, wer aktuell den Lock hält
 * 
 * @param {Object} einheit
 * @returns {string|null} - E-Mail oder null wenn kein Lock
 */
export function getStructuralLockOwner(einheit) {
  if (!einheit?.structural_lock) return null;
  
  const lockedAt = einheit.structural_locked_at 
    ? new Date(einheit.structural_locked_at).getTime() 
    : 0;
  const isExpired = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
  
  return isExpired ? null : einheit.structural_lock;
}

/**
 * Berechnet verbleibende Lock-Zeit in Minuten
 * 
 * @param {Object} einheit
 * @returns {number} - Minuten bis Auto-Timeout, oder -1 wenn Lock abgelaufen
 */
export function getRemainingLockTimeMinutes(einheit) {
  if (!einheit?.structural_locked_at) return -1;
  
  const lockedAt = new Date(einheit.structural_locked_at).getTime();
  const remaining = LOCK_TIMEOUT_MS - (Date.now() - lockedAt);
  
  if (remaining <= 0) return -1;
  return Math.ceil(remaining / 60000);
}

/**
 * Bestimmt welche Buttons für einen Nutzer disabled sein sollen
 * wenn ein fremder Structural Lock aktiv ist
 * 
 * @param {Object} einheit
 * @param {string} currentUserEmail
 * @param {string} userRole - Die Rolle des aktuellen Nutzers
 * @returns {Object} - { isLocked: boolean, disabledActions: Array<string> }
 */
export function getDisabledActionsForLock(einheit, currentUserEmail, userRole) {
  const locked = isStructurallyLocked(einheit, currentUserEmail);
  
  if (!locked) {
    return {
      isLocked: false,
      disabledActions: [],
      lockOwner: null,
      remainingMinutes: -1,
    };
  }

  const lockOwner = getStructuralLockOwner(einheit);
  const remainingMinutes = getRemainingLockTimeMinutes(einheit);
  
  // Alle strukturell schreibenden Aktionen deaktivieren
  const disabledActions = [
    'CREATE_THEMENFELD',      // Neues Themenfeld
    'DELETE_THEMENFELD',      // Themenfeld löschen
    'CREATE_LERNPAKET',       // Neues Lernpaket
    'DELETE_LERNPAKET',       // Lernpaket löschen
    'MOVE_LERNPAKET',         // Lernpaket verschieben
    'DELETE_EINHEIT',         // Einheit löschen
    'CHANGE_RELEASE_STATUS',  // Freigabestatus ändern
  ];

  return {
    isLocked: true,
    disabledActions,
    lockOwner,
    remainingMinutes,
  };
}

/**
 * Bestimmt ob eine spezifische Aktion due zu Lock blockiert ist
 * 
 * @param {string} action - Action-Key (z.B. 'DELETE_THEMENFELD')
 * @param {Array} disabledActions - von getDisabledActionsForLock()
 * @returns {boolean}
 */
export function isActionDisabled(action, disabledActions = []) {
  return disabledActions.includes(action);
}