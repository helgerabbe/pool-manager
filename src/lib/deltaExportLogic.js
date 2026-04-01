/**
 * Utility-Funktionen für Sync-Status und Delta-Export-Logik
 */

export function getDeltaStatus(entity) {
  if (!entity) return 'new';
  if (entity.sync_status === 'new' || !entity.last_synced_at) {
    return 'new';
  }
  if (entity.sync_status === 'exported') {
    const lastSynced = new Date(entity.last_synced_at).getTime();
    const lastUpdated = new Date(entity.updated_date).getTime();
    if (lastUpdated > lastSynced) {
      return 'modified';
    }
    return 'synced';
  }
  if (entity.sync_status === 'modified') {
    return 'pending';
  }
  return 'new';
}

export function isAlreadySynced(entity) {
  return entity?.sync_status === 'exported' && !!entity?.last_synced_at;
}

export function getDeltaStatusText(deltaStatus) {
  const textMap = {
    synced: 'Synchronisiert',
    modified: 'Änderungen ausstehend',
    pending: 'Für Delta-Export vorgemerkt',
    new: 'Noch nicht exportiert',
  };
  return textMap[deltaStatus] || 'Unbekannt';
}

export function getEntitiesNeedingExport(entities) {
  return entities?.filter(e => {
    const status = getDeltaStatus(e);
    return status === 'modified' || status === 'new' || status === 'pending';
  }) || [];
}

export function getExportPendingCount(entities) {
  return getEntitiesNeedingExport(entities).length;
}