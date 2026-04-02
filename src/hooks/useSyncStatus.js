/**
 * useSyncStatus.js
 *
 * Hook für State-Machine-Management von Task-Sync-Status.
 * Encapsuliert Mutations, Übergänge und UI-Logik für Moodle-Export-Tracking.
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export const TASK_SYNC_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved',
  PENDING_EXPORT: 'pending_export',
  EXPORTED: 'exported',
  MODIFIED: 'modified',
  ERROR: 'error',
  TO_DELETE: 'to_delete',
};

/**
 * State-Transitions für Moodle-Export:
 *   draft → (approved|pending_export|to_delete)
 *   approved → (draft|pending_export|to_delete)
 *   exported → (modified|pending_export|to_delete)
 *   modified → (pending_export|to_delete)
 *   error → (draft|to_delete)
 *   pending_export → [BLOCKIERT]
 *   to_delete → [BLOCKIERT]
 */
const ALLOWED_TRANSITIONS = {
  [TASK_SYNC_STATUS.DRAFT]: [
    TASK_SYNC_STATUS.APPROVED,
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.APPROVED]: [
    TASK_SYNC_STATUS.DRAFT,
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.EXPORTED]: [
    TASK_SYNC_STATUS.MODIFIED,
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.MODIFIED]: [
    TASK_SYNC_STATUS.PENDING_EXPORT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.ERROR]: [
    TASK_SYNC_STATUS.DRAFT,
    TASK_SYNC_STATUS.TO_DELETE,
  ],
  [TASK_SYNC_STATUS.PENDING_EXPORT]: [],
  [TASK_SYNC_STATUS.TO_DELETE]: [],
};

/**
 * Berechnet automatisch neuen sync_status basierend auf Edit-Operation.
 *
 * Regeln bei Inhaltsänderung:
 *   - exported + edit → modified (später Moodle-UPDATE)
 *   - approved + edit → draft (Freigabe zurückgenommen)
 *   - draft + edit → draft (bleibt Draft)
 *   - pending_export, to_delete → ERROR (blockiert)
 */
function computeSyncStatusForSave(currentStatus) {
  if (currentStatus === TASK_SYNC_STATUS.PENDING_EXPORT) {
    throw new Error(
      'Aufgabe wird gerade exportiert. Bearbeitungen sind nicht möglich.'
    );
  }

  if (currentStatus === TASK_SYNC_STATUS.TO_DELETE) {
    throw new Error('Aufgabe ist zum Löschen markiert. Bearbeitungen nicht möglich.');
  }

  // exported + edit → modified (Moodle-UPDATE triggern)
  if (currentStatus === TASK_SYNC_STATUS.EXPORTED) {
    return TASK_SYNC_STATUS.MODIFIED;
  }

  // approved + edit → draft (Freigabe zurückgenommen)
  if (currentStatus === TASK_SYNC_STATUS.APPROVED) {
    return TASK_SYNC_STATUS.DRAFT;
  }

  // draft, modified, error → bleiben wie sind
  return currentStatus || TASK_SYNC_STATUS.DRAFT;
}

/**
 * Hook für Task-Sync-Status-Management
 *
 * @param {string} taskId - ID der Task
 * @param {string} initialStatus - Initialer sync_status (z.B. 'new', 'exported')
 * @param {string} entityName - Entity-Name (z.B. 'Aufgabenbausteine', 'MasterAufgabe')
 * @param {Array<string>} invalidateKeys - Query-Keys zum Invalidieren
 */
export function useSyncStatus(
  taskId,
  initialStatus = TASK_SYNC_STATUS.NEW,
  entityName = 'Aufgabenbausteine',
  invalidateKeys = []
) {
  const queryClient = useQueryClient();
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  // ─────────────────────────────────────────────────────────────────────
  // UI-Logik: Edit blockieren bei pending_export, to_delete
  // ─────────────────────────────────────────────────────────────────────
  const isLockedForEdit =
    currentStatus === TASK_SYNC_STATUS.PENDING_EXPORT ||
    currentStatus === TASK_SYNC_STATUS.TO_DELETE;

  // ─────────────────────────────────────────────────────────────────────
  // getSyncStatusForSave: Wird in save-Mutations aufgerufen
  // ─────────────────────────────────────────────────────────────────────
  const getSyncStatusForSave = useCallback(() => {
    return computeSyncStatusForSave(currentStatus);
  }, [currentStatus]);

  // ─────────────────────────────────────────────────────────────────────
  // Mutation: Approval (setzt sync_status: 'approved')
  // ─────────────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: () =>
      base44.entities[entityName].update(taskId, {
        sync_status: TASK_SYNC_STATUS.APPROVED,
      }),
    onSuccess: () => {
      setCurrentStatus(TASK_SYNC_STATUS.APPROVED);
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success('Task freigegeben.');
    },
    onError: (err) => toast.error(err.message || 'Freigabe fehlgeschlagen.'),
  });

  // ─────────────────────────────────────────────────────────────────────
  // Mutation: Schedule Export (setzt sync_status: 'pending_export')
  // ─────────────────────────────────────────────────────────────────────
  const scheduleExportMutation = useMutation({
    mutationFn: () =>
      base44.entities[entityName].update(taskId, {
        sync_status: TASK_SYNC_STATUS.PENDING_EXPORT,
      }),
    onSuccess: () => {
      setCurrentStatus(TASK_SYNC_STATUS.PENDING_EXPORT);
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success('Task zum Export eingeplant.');
    },
    onError: (err) => toast.error(err.message || 'Export-Planung fehlgeschlagen.'),
  });

  // ─────────────────────────────────────────────────────────────────────
  // Mutation: Revoke Export (setzt sync_status zurück zu 'modified')
  // ─────────────────────────────────────────────────────────────────────
  const revokeExportMutation = useMutation({
    mutationFn: () =>
      base44.entities[entityName].update(taskId, {
        sync_status: TASK_SYNC_STATUS.MODIFIED,
      }),
    onSuccess: () => {
      setCurrentStatus(TASK_SYNC_STATUS.MODIFIED);
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success('Export-Planung zurückgezogen.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Zurückziehen.'),
  });

  // ─────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────
  return {
    // State
    currentStatus,
    isLockedForEdit,

    // Helpers
    getSyncStatusForSave,
    getAllowedTransitions: () => ALLOWED_TRANSITIONS[currentStatus] || [],
    canTransitionTo: (newStatus) =>
      (ALLOWED_TRANSITIONS[currentStatus] || []).includes(newStatus),

    // Mutations
    approveMutation,
    scheduleExportMutation,
    revokeExportMutation,

    // Manual state update (für realtime-subscriptions)
    setCurrentStatus,
  };
}

export default useSyncStatus;