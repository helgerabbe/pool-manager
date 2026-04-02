/**
 * contentStatusLogic.js
 * 
 * 2-Signal-System Logik für Ebenen 1-4:
 * 
 * EBENE 1-2 (Struktur-Container: Einheiten, Themenfelder, Lernpakete):
 * - content_status: IMMER 'approved' (Auto-Grün, da nur Struktur-Hüllen)
 * - sync_status: normal lifecycle ('new' → 'modified' → 'synced' → etc.)
 * 
 * EBENE 3 (Leere Aktivitäts-Hüllen):
 * - content_status: FORCED 'draft' (erzwingt inhaltliche Arbeit)
 * - sync_status: 'new' bei Erstellung
 * 
 * EBENE 4 (Klone & Masters):
 * - content_status: User-controlled ('draft' ↔ 'approved')
 * - sync_status: normal lifecycle
 * 
 * TOMBSTONE-PRINZIP:
 * - DELETE → UPDATE mit sync_status='to_delete'
 * - UI filtert 'to_delete' aus (nur für Nutzer unsichtbar)
 * - Export-Center kann sie noch abrufen
 */

/**
 * Berechnet die neuen Status-Werte, wenn eine Aufgabe bearbeitet wird.
 * 
 * Regel: Wenn content_status === 'approved' und Benutzer speichert Änderungen,
 * dann muss content_status zurück auf 'draft' (da Änderungen neu abgenommen werden müssen).
 * 
 * @param {object} currentData - Aktuelle Daten aus der DB
 * @param {string} currentData.content_status - Aktueller pädagogischer Status
 * @param {string} currentData.sync_status - Aktueller Sync-Status
 * @returns {object} - { content_status, sync_status }
 */
export function calculateStatusesOnEdit(currentData) {
  const { content_status = 'draft', sync_status = 'new' } = currentData;

  // Wenn content_status 'approved' war und jetzt bearbeitet wird → zurück auf 'draft'
  let newContentStatus = content_status;
  if (content_status === 'approved') {
    newContentStatus = 'draft';
  }

  // Wenn sync_status 'synced' war und jetzt bearbeitet wird → wechsel zu 'modified'
  let newSyncStatus = sync_status;
  if (sync_status === 'synced') {
    newSyncStatus = 'modified';
  }

  return {
    content_status: newContentStatus,
    sync_status: newSyncStatus,
  };
}

/**
 * Berechnet die neuen Sync-Status-Werte für den Export.
 * 
 * Regeln für den Übergang zur Moodle-Synchronisation:
 * - 'new' → 'pending' (wenn content_status === 'approved')
 * - 'modified' → 'pending' (wenn content_status === 'approved')
 * - 'synced' bleibt 'synced' (bis nächste Edit)
 * 
 * @param {string} currentSyncStatus - Aktueller Sync-Status
 * @param {string} currentContentStatus - Aktueller Content-Status
 * @returns {string} - Neuer Sync-Status
 */
export function calculateSyncStatusForExport(currentSyncStatus, currentContentStatus) {
  if (currentContentStatus !== 'approved') {
    return currentSyncStatus; // Keine Änderung, wenn nicht 'approved'
  }

  // Wenn 'approved', dann kann es in den Export gehen
  if (currentSyncStatus === 'new' || currentSyncStatus === 'modified') {
    return 'pending'; // Wartet auf Export
  }

  return currentSyncStatus; // Sonst keine Änderung
}

/**
 * Prüft, ob eine Aufgabe für den Moodle-Export bereit ist.
 * 
 * @param {object} task - Die Aufgabe/Activity/Master
 * @returns {boolean} - true wenn content_status === 'approved'
 */
export function isReadyForExport(task) {
  return task?.content_status === 'approved';
}

/**
 * Badge-Konfiguration für pädagogischen Status (content_status)
 */
export const CONTENT_STATUS_CONFIG = {
  draft: {
    label: 'In Bearbeitung',
    emoji: '🔴',
    color: 'bg-red-100 text-red-700 border-red-300',
    description: 'Aufgabe wird noch bearbeitet, nicht freigegeben für Export.',
  },
  approved: {
    label: 'Fertig für Export',
    emoji: '🟢',
    color: 'bg-green-100 text-green-700 border-green-300',
    description: 'Aufgabe ist pädagogisch fertiggestellt und bereit für Moodle-Export.',
  },
};

/**
 * Badge-Konfiguration für Sync-Status (sync_status)
 */
export const SYNC_STATUS_CONFIG = {
  new: {
    label: 'Noch nicht exportiert',
    color: 'bg-slate-100 text-slate-700',
    description: 'Noch nie in Moodle exportiert',
  },
  pending: {
    label: 'Wartet auf Export',
    color: 'bg-blue-100 text-blue-700',
    description: 'Wartet auf die nächste Moodle-Synchronisation',
  },
  synced: {
    label: 'Live in Moodle',
    color: 'bg-green-100 text-green-700',
    description: 'Erfolgreich in Moodle exportiert',
  },
  modified: {
    label: 'Nach Export geändert',
    color: 'bg-amber-100 text-amber-700',
    description: 'Wurde nach dem letzten Export verändert',
  },
  to_delete: {
    label: 'Zur Löschung vorgesehen',
    color: 'bg-red-100 text-red-700',
    description: 'Soll beim nächsten Sync gelöscht werden (Tombstone)',
  },
};

/**
 * Struktur-Automatik für Container (Einheiten, Themenfelder, Lernpakete)
 * 
 * Diese sind IMMER 'approved', da sie nur strukturelle Hüllen sind.
 * Die pädagogische Qualität sitzt in den Child-Elementen (Aktivitäten, Klone).
 */
export const STRUCTURE_CONTAINER_DEFAULTS = {
  content_status: 'approved', // Auto-Grün: Struktur-Container haben keine inhaltliche Freigabe
  sync_status: 'new', // Bei Erstellung
};

/**
 * Forced Draft für leere Aktivitäten-Hüllen (Ebene 3)
 * 
 * Wenn eine Aktivität aus dem Katalog neu zugeordnet wird, ist sie inhaltlich leer.
 * Die forced-Draft-Logik erzwingt, dass der Inhalt gefüllt werden muss.
 */
export const EMPTY_ACTIVITY_DEFAULTS = {
  content_status: 'draft', // FORCED: erzwingt Inhalt-Arbeit
  sync_status: 'new',
  is_complete: false,
  field_values: {},
};

/**
 * Prüft, ob ein Element ein Tombstone ist
 * 
 * @param {object} element - Das Element (Lernpaket, Aktivität, etc.)
 * @returns {boolean} - true wenn sync_status === 'to_delete'
 */
export function isTombstone(element) {
  return element?.sync_status === 'to_delete';
}