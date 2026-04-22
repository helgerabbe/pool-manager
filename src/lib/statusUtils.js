/**
 * lib/statusUtils.js
 * 
 * "Wahrheits-Gesetz": Zentrale Status-Logik für alle Entities
 * Status sind: draft, approved, synced, modified
 */

const STATUS_CONFIG = {
  draft: {
    label: 'Entwurf',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: '✏️',
  },
  approved: {
    label: 'Bereit',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '✓',
  },
  synced: {
    label: 'Exportiert',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '☑️',
  },
  modified: {
    label: 'Geändert',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '⚡',
  },
};

/**
 * Resolves status information for an item
 * @param {Object} item - Entity mit content_status
 * @returns {Object} - { label, color, bgColor, borderColor, icon, status }
 */
export function resolveStatus(item) {
  const status = item?.content_status || 'draft';
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return {
    status,
    ...config,
  };
}

/**
 * Gibt nur das Label für einen Status zurück
 */
export function getStatusLabel(contentStatus) {
  return STATUS_CONFIG[contentStatus]?.label || 'Unbekannt';
}

/**
 * Gibt nur die Farbe für einen Status zurück
 */
export function getStatusColor(contentStatus) {
  return STATUS_CONFIG[contentStatus]?.color || 'text-gray-500';
}

/**
 * Prüft ob Status "approved" ist
 */
export function isApproved(item) {
  return item?.content_status === 'approved';
}

/**
 * Prüft ob Status "synced" ist
 */
export function isSynced(item) {
  return item?.content_status === 'synced';
}

/**
 * Prüft ob Änderungen nach Sync vorgenommen wurden
 */
export function isModified(item) {
  return item?.content_status === 'modified';
}