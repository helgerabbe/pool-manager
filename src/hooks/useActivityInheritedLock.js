import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLernpaketLockGlobal } from '@/lib/LernpaketLockContext';

/**
 * useActivityInheritedLock
 * 
 * Hook für Aktivitäten, die ihren Lock vom übergeordneten Lernpaket erben.
 * 
 * Die Aktivität kann nur bearbeitet werden, wenn:
 * 1. Das übergeordnete Lernpaket durch den aktuellen User gesperrt ist
 * 2. Das übergeordnete Lernpaket existiert und geladen ist
 * 
 * Props:
 * - lernpaketId: ID des übergeordneten Lernpakets
 * - userEmail: Email des aktuellen Users
 * - canEdit: Globale Berechtigung
 * - einheitId: Einheit ID (für Updates)
 * - fach: Fachbereich (für Updates)
 */
export function useActivityInheritedLock(lernpaketId, userEmail, canEdit, einheitId, fach) {
  const queryClient = useQueryClient();
  const globalLock = useLernpaketLockGlobal();

  // Status vom Parent erben
  const isParentLockedByMe = globalLock.isLockedByMe(lernpaketId, userEmail);
  const isParentLockedByOther = globalLock.isLockedByOther(lernpaketId, userEmail);
  const parentLockedByUser = globalLock.lockedByUser;

  // Editierbar nur wenn Parent durch mich gesperrt
  const canActuallyEdit = canEdit && isParentLockedByMe;

  const saveActivity = useCallback(
    async (activityId, fieldValues) => {
      if (!canActuallyEdit) {
        toast.error('Das übergeordnete Lernpaket ist nicht für Sie gesperrt.');
        return false;
      }

      try {
        const result = await base44.functions.invoke('updateActivitySecure', {
          activityId,
          fieldValues,
          einheitId,
          targetFach: fach,
        });

        if (result?.data?.success) {
          queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
          toast.success('Aktivität gespeichert.');
          return true;
        } else {
          toast.error(result?.data?.error || 'Fehler beim Speichern.');
          return false;
        }
      } catch (err) {
        console.error('[saveActivity] Error:', err);
        toast.error('Fehler beim Speichern der Aktivität.');
        return false;
      }
    },
    [canActuallyEdit, einheitId, fach, queryClient]
  );

  return {
    // Editierbar nur wenn Parent-Lernpaket durch mich gesperrt
    isEditMode: isParentLockedByMe && canEdit,

    // Parent-Status
    isParentLockedByMe,
    isParentLockedByOther,
    parentLockedByUser,

    // Speichern
    saveActivity,

    // Globale Lock-Infos
    currentLockedLernpaketId: globalLock.currentLockedLernpaketId,
  };
}