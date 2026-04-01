import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRBAC } from '@/hooks/useRBAC';

/**
 * Wrapper für useMutation mit API-Level RBAC-Prüfung
 * 
 * @param {Object} options - Standard useMutation-Optionen
 * @param {Function} options.mutationFn - Die API-Funktion
 * @param {Function} options.permissionCheck - Rückgabe true wenn erlaubt, false wenn nicht
 * @param {string} options.denialMessage - Toast-Nachricht bei Ablehnung
 * @param {Object} otherOptions - Alle anderen useMutation-Optionen (onSuccess, etc.)
 * 
 * @example
 * const mutation = useProtectedMutation({
 *   mutationFn: (data) => base44.entities.Einheiten.create(data),
 *   permissionCheck: () => permissions.kannEinheitVerwalten,
 *   denialMessage: 'Keine Berechtigung zum Erstellen von Einheiten',
 * }, {
 *   onSuccess: () => queryClient.invalidateQueries(...),
 * });
 */
export function useProtectedMutation(
  { mutationFn, permissionCheck, denialMessage = 'Keine Berechtigung für diese Aktion' },
  otherOptions = {}
) {
  const { permissions } = useRBAC();

  return useMutation(
    {
      mutationFn: async (payload) => {
        // Berechtigungsprüfung VOR dem API-Call
        if (typeof permissionCheck === 'function') {
          const hasPermission = permissionCheck(permissions);
          if (!hasPermission) {
            toast.error(denialMessage);
            throw new Error('UNAUTHORIZED');
          }
        } else if (!permissionCheck) {
          toast.error(denialMessage);
          throw new Error('UNAUTHORIZED');
        }

        // Mutation ausführen
        return mutationFn(payload);
      },
      ...otherOptions,
    },
    // Falls es noch ein zweites Argument gab (deprecated, aber sicherheitshalber)
    ...(Object.keys(otherOptions).length > 0 ? [] : [])
  );
}

/**
 * Spezialisierter Hook für Einheiten-Mutations (Create/Update/Delete)
 */
export function useProtectedEinheitMutation(mutationType, entityId = null) {
  const { permissions } = useRBAC();

  return {
    canCreate: () => permissions.kannEinheitVerwalten,
    canUpdate: (einheit) => permissions.kannEinheitBearbeiten(einheit?.fach),
    canDelete: (einheit) => permissions.kannEinheitVerwalten && permissions.kannEinheitBearbeiten(einheit?.fach),
    canChangeStatus: (einheit) => permissions.kannFreigabeStatusAendern(einheit?.fach),
  };
}

/**
 * Spezialisierter Hook für Basismodul-Mutations (mit Fachschafts-Isolation)
 */
export function useProtectedBasismodulMutation() {
  const { permissions } = useRBAC();

  return {
    canCreate: () => permissions.kannSchreiben,
    canUpdate: (basismodul) => {
      // Nur wenn der Nutzer für das Fach zuständig ist ODER Admin
      return permissions.kannEinheitBearbeiten(basismodul?.fach);
    },
    canDelete: (basismodul) => {
      return permissions.kannEinheitBearbeiten(basismodul?.fach);
    },
  };
}

/**
 * Spezialisierter Hook für Aufgabenbaustein-Mutations
 */
export function useProtectedAufgabenbaustein(lernpaket = null, einheit = null) {
  const { permissions } = useRBAC();

  return {
    canCreate: () => {
      if (!einheit) return permissions.kannSchreiben;
      return permissions.kannEinheitBearbeiten(einheit.fach);
    },
    canUpdate: () => {
      if (!einheit) return permissions.kannSchreiben;
      return permissions.kannEinheitBearbeiten(einheit.fach);
    },
    canDelete: () => {
      if (!einheit) return permissions.kannSchreiben;
      return permissions.kannEinheitBearbeiten(einheit.fach);
    },
  };
}