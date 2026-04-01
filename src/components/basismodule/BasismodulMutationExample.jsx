/**
 * BEISPIEL: Wie man useProtectedMutation mit Basismodulen nutzt
 * 
 * Diese Datei zeigt die Integration von API-Level RBAC-Protection
 * für sicheren Datenzugriff auf Basismodule mit Fachschafts-Isolation.
 */

import { useProtectedMutation, useProtectedBasismodulMutation } from '@/hooks/useProtectedMutation';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Beispiel 1: Sicheres Erstellen eines Basismoduls
 */
export function useSafeCreateBasismodul() {
  const queryClient = useQueryClient();
  const { canCreate } = useProtectedBasismodulMutation();

  return useProtectedMutation(
    {
      mutationFn: (data) => base44.entities.Basismodule.create(data),
      permissionCheck: canCreate(),
      denialMessage: 'Keine Berechtigung zum Erstellen von Basismodulen',
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['basismodule'] });
        toast.success('Basismodul erstellt');
      },
      onError: (err) => {
        if (err.message !== 'UNAUTHORIZED') {
          toast.error('Fehler beim Erstellen');
        }
      },
    }
  );
}

/**
 * Beispiel 2: Sicheres Updaten mit Fachschafts-Prüfung
 */
export function useSafeUpdateBasismodul(basismodul) {
  const queryClient = useQueryClient();
  const { canUpdate } = useProtectedBasismodulMutation();

  return useProtectedMutation(
    {
      mutationFn: (data) => base44.entities.Basismodule.update(basismodul?.id, data),
      permissionCheck: () => canUpdate(basismodul),
      denialMessage: `Keine Berechtigung zum Bearbeiten von ${basismodul?.fach || 'diesem Modul'}`,
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['basismodule'] });
        toast.success('Basismodul aktualisiert');
      },
      onError: (err) => {
        if (err.message !== 'UNAUTHORIZED') {
          toast.error('Fehler beim Aktualisieren');
        }
      },
    }
  );
}

/**
 * Beispiel 3: Sicheres Löschen mit doppelter Prüfung
 */
export function useSafeDeleteBasismodul(basismodul) {
  const queryClient = useQueryClient();
  const { canDelete } = useProtectedBasismodulMutation();

  return useProtectedMutation(
    {
      mutationFn: () => base44.entities.Basismodule.delete(basismodul?.id),
      permissionCheck: () => canDelete(basismodul),
      denialMessage: `Keine Berechtigung zum Löschen von ${basismodul?.fach || 'diesem Modul'}`,
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['basismodule'] });
        toast.success('Basismodul gelöscht');
      },
      onError: (err) => {
        if (err.message !== 'UNAUTHORIZED') {
          toast.error('Fehler beim Löschen');
        }
      },
    }
  );
}