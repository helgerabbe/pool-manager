/**
 * Utility-Funktionen für Sync-Status und Delta-Export-Logik
 */

/**
 * Berechnet den aktuellen Sync-Status einer Entity
 * 
 * @param {Object} entity - Die Entity (Einheit, Aufgabenbaustein, Basismodul)
 * @returns {string} - 'synced' | 'modified' | 'pending' | 'new'
 */
export function getDeltaStatus(entity) {
  if (!entity) return 'new';

  // Neu erstellt und nie exportiert
  if (entity.sync_status === 'new' || !entity.last_synced_at) {
    return 'new';
  }

  // Wurde schon exportiert
  if (entity.sync_status === 'exported') {
    // Vergleiche updated_date mit last_synced_at
    const lastSynced = new Date(entity.last_synced_at).getTime();
    const lastUpdated = new Date(entity.updated_date).getTime();

    // Wenn es nach dem Export aktualisiert wurde
    if (lastUpdated > lastSynced) {
      return 'modified';
    }

    // Vollständig synchronisiert
    return 'synced';
  }

  // Markiert als "modified" → ausstehend
  if (entity.sync_status === 'modified') {
    return 'pending';
  }

  return 'new';
}

/**
 * Prüft, ob eine Entity bereits in Moodle live ist
 * (wurde bereits synchronisiert)
 * 
 * @param {Object} entity
 * @returns {boolean}
 */
export function isAlreadySynced(entity) {
  return entity?.sync_status === 'exported' && !!entity?.last_synced_at;
}

/**
 * Gibt einen benutzerfreundlichen Status-Text zurück
 * 
 * @param {string} deltaStatus - Ergebnis von getDeltaStatus()
 * @returns {string}
 */
export function getDeltaStatusText(deltaStatus) {
  const textMap = {
    synced: 'Synchronisiert',
    modified: 'Änderungen ausstehend',
    pending: 'Für Delta-Export vorgemerkt',
    new: 'Noch nicht exportiert',
  };
  return textMap[deltaStatus] || 'Unbekannt';
}

/**
 * Filtert Entities, die Änderungen haben und neu exportiert werden müssen
 * 
 * @param {Array} entities
 * @returns {Array} - Nur Entities mit status 'modified' oder 'new'
 */
export function getEntitiesNeedingExport(entities) {
  return entities?.filter(e => {
    const status = getDeltaStatus(e);
    return status === 'modified' || status === 'new' || status === 'pending';
  }) || [];
}

/**
 * Gibt die Anzahl ausstehender Exporte für eine Collection
 * 
 * @param {Array} entities
 * @returns {number}
 */
export function getExportPendingCount(entities) {
  return getEntitiesNeedingExport(entities).length;
}