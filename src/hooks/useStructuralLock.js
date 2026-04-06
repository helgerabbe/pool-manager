/**
 * useStructuralLock.js (Utility-Datei)
 * ─────────────────────────────────────
 * 
 * Beachte: Auto-Locking wurde entfernt, um Race Conditions zu vermeiden.
 * Locks werden ausschließlich über explizite Backend-Funktionen gesteuert:
 *   - acquireLockSecure() zum Setzen des Locks
 *   - releaseLockSecure() zum Freigeben des Locks
 *   - lockReaper läuft server-seitig zur Timeout-Bereinigung
 * 
 * Diese Datei enthält nur die Hilfsfunktion zur Evaluierung des Lock-Status.
 */

const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min

/**
 * Prüft ob eine Einheit aktuell einen aktiven Structural Lock hat
 * (von jemand anderem als dem aktuellen Nutzer).
 * 
 * @param {Object} einheit - Die Einheit-Entity
 * @param {string} currentUserEmail - Email des aktuellen Nutzers
 * @returns {boolean} true wenn Lock von anderem User aktiv ist
 */
export function isStructurallyLocked(einheit, currentUserEmail) {
  if (!einheit?.structural_lock) return false;
  if (einheit.structural_lock === currentUserEmail) return false;
  const lockedAt = einheit.structural_locked_at ? new Date(einheit.structural_locked_at).getTime() : 0;
  return Date.now() - lockedAt < LOCK_TIMEOUT_MS;
}