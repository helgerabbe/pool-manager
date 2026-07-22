/**
 * lib/releaseLockCheck.js
 *
 * Sperr-Check-Bibliothek (Single Source of Truth) für die Freigabe-Hierarchie.
 *
 * Hierarchie (oben sperrt unten):
 *   Einheit (export_lifecycle_status)
 *     └── Lernpaket (content_status = 'approved')
 *           └── Aktivität / MasterAufgabe (content_status = 'approved')
 *
 * Außerdem:
 *   AllgemeineAufgabe / Projekt: eigene Freigabe-Sperre über content_status.
 *
 * Reine Funktionen, keine Side-Effects, keine Netzwerk-Calls.
 * Wird sowohl im Frontend (UI-Disable) als auch im Backend (Edit-Block) genutzt.
 */

// Lifecycle-Status-Werte, ab denen die Einheit „final" gilt und alle
// darunter liegenden Bearbeitungen gesperrt sind.
const EINHEIT_LOCKING_LIFECYCLES = new Set([
  'final_freigegeben',
  'export_running',
  'published',
]);

// ---------------------------------------------------------------------------
// Basis-Prüfungen (einzelne Ebenen)
// ---------------------------------------------------------------------------

/**
 * Ist die Einheit in einem Status, der alle Bearbeitungen sperrt?
 */
export function isEinheitLocked(einheit) {
  if (!einheit) return false;
  return EINHEIT_LOCKING_LIFECYCLES.has(einheit.export_lifecycle_status);
}

/**
 * Privat-Modus (2026-07-22): Private Einheiten gehören genau einer Person —
 * der Freigabe-Workflow (content_status) ist dort kein Sicherheitsmerkmal.
 * Freigabe-Sperren gelten in privaten Einheiten NICHT; die Toggle-UI wird
 * dort komplett ausgeblendet. Öffentliche Einheiten sind unberührt.
 */
export function isPrivateEinheit(einheit) {
  return einheit?.sichtbarkeit === 'privat';
}

/**
 * Ist das Lernpaket selbst freigegeben? (Manuelle Lehrer-Freigabe)
 *
 * Wichtig: Struktur-Container haben historisch immer content_status='approved'
 * (Auto-Grün). Erst MIT released_at gilt es als manuelle Lehrer-Freigabe.
 * Falls released_at noch nicht migriert ist, gelten ältere Lernpakete als
 * NICHT freigegeben (sicherer Default — der Lehrer muss aktiv freigeben).
 */
export function isLernpaketReleased(lernpaket) {
  if (!lernpaket) return false;
  return lernpaket.content_status === 'approved' && !!lernpaket.released_at;
}

/**
 * Ist die Aktivität freigegeben? (Manuelle Lehrer-Freigabe)
 */
export function isActivityReleased(activity) {
  if (!activity) return false;
  return activity.content_status === 'approved';
}

/**
 * Ist die AllgemeineAufgabe / Projekt freigegeben?
 */
export function isAllgemeineAufgabeReleased(aufgabe) {
  if (!aufgabe) return false;
  return aufgabe.content_status === 'approved';
}

// ---------------------------------------------------------------------------
// Effektiver Sperrstatus (Hierarchie aufgelöst)
// ---------------------------------------------------------------------------

/**
 * Liefert den effektiven Sperrgrund für eine Aktivität (Master/Klon ebenfalls).
 *
 * @param {object} activity
 * @param {object} lernpaket  Parent
 * @param {object} einheit    Grandparent
 * @returns {{ locked: boolean, reason: string|null, message: string|null }}
 *   reason ∈ 'einheit_final' | 'lernpaket_released' | 'activity_released' | null
 */
export function getActivityLockReason(activity, lernpaket, einheit) {
  if (isEinheitLocked(einheit)) {
    return {
      locked: true,
      reason: 'einheit_final',
      message: 'Einheit ist final freigegeben — Bearbeitung gesperrt',
    };
  }
  // Privat: Freigabe-Status sperrt nie die Bearbeitung.
  if (isPrivateEinheit(einheit)) {
    return { locked: false, reason: null, message: null };
  }
  if (isLernpaketReleased(lernpaket)) {
    return {
      locked: true,
      reason: 'lernpaket_released',
      message: 'Lernpaket ist freigegeben — Bearbeitung gesperrt',
    };
  }
  if (isActivityReleased(activity)) {
    return {
      locked: true,
      reason: 'activity_released',
      message: 'Aktivität ist freigegeben — Bearbeitung gesperrt',
    };
  }
  return { locked: false, reason: null, message: null };
}

/**
 * Liefert den effektiven Sperrgrund für ein Lernpaket selbst.
 */
export function getLernpaketLockReason(lernpaket, einheit) {
  if (isEinheitLocked(einheit)) {
    return {
      locked: true,
      reason: 'einheit_final',
      message: 'Einheit ist final freigegeben — Bearbeitung gesperrt',
    };
  }
  // Privat: Freigabe-Status sperrt nie die Bearbeitung.
  if (isPrivateEinheit(einheit)) {
    return { locked: false, reason: null, message: null };
  }
  if (isLernpaketReleased(lernpaket)) {
    return {
      locked: true,
      reason: 'lernpaket_released',
      message: 'Lernpaket ist freigegeben — Bearbeitung gesperrt',
    };
  }
  return { locked: false, reason: null, message: null };
}

/**
 * Liefert den effektiven Sperrgrund für eine AllgemeineAufgabe / Projekt.
 */
export function getAllgemeineAufgabeLockReason(aufgabe, einheit) {
  if (isEinheitLocked(einheit)) {
    return {
      locked: true,
      reason: 'einheit_final',
      message: 'Einheit ist final freigegeben — Bearbeitung gesperrt',
    };
  }
  // Privat: Freigabe-Status sperrt nie die Bearbeitung.
  if (isPrivateEinheit(einheit)) {
    return { locked: false, reason: null, message: null };
  }
  if (isAllgemeineAufgabeReleased(aufgabe)) {
    return {
      locked: true,
      reason: 'aufgabe_released',
      message: 'Aufgabe ist freigegeben — Bearbeitung gesperrt',
    };
  }
  return { locked: false, reason: null, message: null };
}

// ---------------------------------------------------------------------------
// Toggle-Berechtigungen (kann ich den Freigabe-Toggle bedienen?)
// ---------------------------------------------------------------------------

/**
 * Darf der Lehrer den Freigabe-Toggle einer Aktivität bedienen?
 *
 * Regel:
 * - Wenn Einheit final freigegeben → Toggle gesperrt (auch Rücknahme)
 * - Wenn Lernpaket freigegeben → Toggle gesperrt (erst Lernpaket-Freigabe zurücknehmen)
 * - Sonst frei (Vollständigkeit prüft separat das UI)
 */
export function canToggleActivityRelease(activity, lernpaket, einheit) {
  if (isEinheitLocked(einheit)) {
    return { allowed: false, reason: 'einheit_final' };
  }
  if (isLernpaketReleased(lernpaket)) {
    return { allowed: false, reason: 'lernpaket_released' };
  }
  return { allowed: true, reason: null };
}

/**
 * Darf der Lehrer den Freigabe-Toggle eines Lernpakets bedienen?
 */
export function canToggleLernpaketRelease(lernpaket, einheit) {
  if (isEinheitLocked(einheit)) {
    return { allowed: false, reason: 'einheit_final' };
  }
  return { allowed: true, reason: null };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export default {
  isEinheitLocked,
  isPrivateEinheit,
  isLernpaketReleased,
  isActivityReleased,
  isAllgemeineAufgabeReleased,
  getActivityLockReason,
  getLernpaketLockReason,
  getAllgemeineAufgabeLockReason,
  canToggleActivityRelease,
  canToggleLernpaketRelease,
};