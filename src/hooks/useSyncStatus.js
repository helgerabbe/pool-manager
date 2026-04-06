/**
 * useSyncStatus.js (Refactored)
 *
 * Hook für State-Machine-Management von Task-Sync-Status.
 * Encapsuliert Mutations, Übergänge und UI-Logik für Moodle-Export-Tracking.
 *
 * Refactoring (2026-04-06):
 * - Direktes Nutzen von `status` (Props) statt lokalem useState → Reaktivität auf Prop-Änderungen
 * - Fallback DRAFT statt fehlerhaftem NEW
 * - Optimistic Updates via onMutate in Mutations
 * - Dynamisches Revoke mit targetStatus Parameter
 */

import { useCallback } from 'react';
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
 * @param {string} status - Aktueller sync_status aus Backend/React Query (Quelle der Wahrheit)
 * @param {string} entityName - Entity-Name (z.B. 'Aufgabenbausteine', 'MasterAufgabe')
 * @param {Array<string>} invalidateKeys - Query-Keys zum Invalidieren
 */
export function useSyncStatus(
  taskId,
  status = TASK_SYNC_STATUS.DRAFT,
  entityName = 'Aufgabenbausteine',
  invalidateKeys = []
) {
  const queryClient = useQueryClient();

  // ─────────────────────────────────────────────────────────────────────
  // UI-Logik: Edit blockieren bei pending_export, to_delete
  // ─────────────────────────────────────────────────────────────────────
  const isLockedForEdit =
    status === TASK_SYNC_STATUS.PENDING_EXPORT ||
    status === TASK_SYNC_STATUS.TO_DELETE;

  // ─────────────────────────────────────────────────────────────────────
  // getSyncStatusForSave: Wird in save-Mutations aufgerufen
  // ─────────────────────────────────────────────────────────────────────
  const getSyncStatusForSave = useCallback(() => {
    return computeSyncStatusForSave(status);
  }, [status]);

  // ─────────────────────────────────────────────────────────────────────
  // Mutation: Approval (setzt sync_status: 'approved')
  // ─────────────────────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: () =>
      base44.entities[entityName].update(taskId, {
        sync_status: TASK_SYNC_STATUS.APPROVED,
      }),
    onMutate: async () => {
      // Optimistic Update: Cache sofort aktualisieren
      invalidateKeys.forEach(key => {
        queryClient.setQueryData([key], (oldData) => {
          if (!oldData) return oldData;
          return Array.isArray(oldData)
            ? oldData.map(item => 
                item.id === taskId ? { ...item, sync_status: TASK_SYNC_STATUS.APPROVED } : item
              )
            : oldData;
        });
      });
    },
    onSuccess: () => {
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success('Task freigegeben.');
    },
    onError: (err) => {
      toast.error(err.message || 'Freigabe fehlgeschlagen.');
      // Cache bei Fehler zurückrollen via QueryClient
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────
  // Mutation: Schedule Export (setzt sync_status: 'pending_export')
  // ─────────────────────────────────────────────────────────────────────
  const scheduleExportMutation = useMutation({
    mutationFn: () =>
      base44.entities[entityName].update(taskId, {
        sync_status: TASK_SYNC_STATUS.PENDING_EXPORT,
      }),
    onMutate: async () => {
      // Optimistic Update
      invalidateKeys.forEach(key => {
        queryClient.setQueryData([key], (oldData) => {
          if (!oldData) return oldData;
          return Array.isArray(oldData)
            ? oldData.map(item => 
                item.id === taskId ? { ...item, sync_status: TASK_SYNC_STATUS.PENDING_EXPORT } : item
              )
            : oldData;
        });
      });
    },
    onSuccess: () => {
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success('Task zum Export eingeplant.');
    },
    onError: (err) => {
      toast.error(err.message || 'Export-Planung fehlgeschlagen.');
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────
  // Mutation: Revoke Export (dynamisch mit targetStatus)
  // Fallback: targetStatus = DRAFT (für neue, noch nicht exportierte Tasks)
  // ─────────────────────────────────────────────────────────────────────
  const revokeExportMutation = useMutation({
    mutationFn: ({ targetStatus = TASK_SYNC_STATUS.DRAFT } = {}) =>
      base44.entities[entityName].update(taskId, {
        sync_status: targetStatus,
      }),
    onMutate: async ({ targetStatus = TASK_SYNC_STATUS.DRAFT } = {}) => {
      // Optimistic Update mit Zielstatus
      invalidateKeys.forEach(key => {
        queryClient.setQueryData([key], (oldData) => {
          if (!oldData) return oldData;
          return Array.isArray(oldData)
            ? oldData.map(item => 
                item.id === taskId ? { ...item, sync_status: targetStatus } : item
              )
            : oldData;
        });
      });
    },
    onSuccess: () => {
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      toast.success('Export-Planung zurückgezogen.');
    },
    onError: (err) => {
      toast.error(err.message || 'Fehler beim Zurückziehen.');
      invalidateKeys.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────
  return {
    // State (direkter Prop-Input, keine Kopie)
    status,
    isLockedForEdit,

    // Helpers
    getSyncStatusForSave,
    getAllowedTransitions: () => ALLOWED_TRANSITIONS[status] || [],
    canTransitionTo: (newStatus) =>
      (ALLOWED_TRANSITIONS[status] || []).includes(newStatus),

    // Mutations
    approveMutation,
    scheduleExportMutation,
    revokeExportMutation,
  };
}

export default useSyncStatus;