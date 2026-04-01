/**
 * useWorkspaceData.js
 *
 * Phase 6.5: Verschlankter React Query Hook
 *
 * Ersetzt die bisherigen 5-8 separaten useQuery-Hooks:
 * - ALTES PATTERN: useQuery(['einheiten']), useQuery(['themenfelder']), useQuery(['lernpakete']), ...
 * - NEUES PATTERN: useWorkspaceData(einheitId) — Single Query!
 *
 * Vorteile:
 * ✅ N+1 Problem gelöst: 1 Abfrage statt 5-8
 * ✅ Hierarchische Daten direkt vom Backend
 * ✅ Kein Client-Side Filtering mehr nötig
 * ✅ Frontend bleibt schlanker
 */

import { useQuery } from '@tanstack/react-query';
import { secureApi } from '@/api/secureApi';

/**
 * @param {string} einheitId - Die ID der Einheit
 * @param {Object} options - React Query Options (enabled, staleTime, etc.)
 * @returns {Object} { data, isLoading, error, refetch }
 *   - data.einheit: { id, titel_der_einheit, ... }
 *   - data.themenfelder: [ { id, lernpakete: [...] } ]
 *   - data._flat: { lernpakete: [...], lernziele: [...], aufgaben: [...] } (für Lookups)
 */
export function useWorkspaceData(einheitId, options = {}) {
  return useQuery({
    queryKey: ['workspaceData', einheitId],
    queryFn: async () => {
      const result = await secureApi.getWorkspaceData(einheitId);
      return result.data;
    },
    enabled: !!einheitId,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000, // 10 min (formerly cacheTime)
    ...options,
  });
}

/**
 * Convenience Hook: Extrahiere spezifische Strukturen aus der Hierarchie
 *
 * @param {string} einheitId
 * @returns {Object} { einheit, themenfelder, lernpakete, lernziele, aufgaben, isLoading, error }
 *
 * @example
 * const { einheit, themenfelder, lernziele, aufgaben } = useWorkspaceDataFlat(id);
 * // Direkter Zugriff auf flache Arrays (keine Hierarchie-Navigation nötig)
 */
export function useWorkspaceDataFlat(einheitId) {
  const { data, isLoading, error } = useWorkspaceData(einheitId);

  return {
    einheit: data?.einheit,
    themenfelder: data?.themenfelder || [],
    lernpakete: data?._flat?.lernpakete || [],
    lernziele: data?._flat?.lernziele || [],
    aufgaben: data?._flat?.aufgaben || [],
    isLoading,
    error,
  };
}