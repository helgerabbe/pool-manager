/**
 * useEinheitenList.js
 *
 * Phase 6.5: Paginierter Hook für Einheiten-Übersicht
 *
 * Implementiert React Query `keepPreviousData` Pattern für nahtlose Pagination:
 * - Während Seite lädt: Alte Daten bleiben sichtbar (placeholderData)
 * - Neue Daten laden: isPlaceholderData = true
 * - Neue Daten fertig: isPlaceholderData = false
 *
 * Usage:
 * const { einheiten, meta, isPending, isPlaceholderData } = useEinheitenList(page, limit);
 */

import { useQuery } from '@tanstack/react-query';
import { secureApi } from '@/api/secureApi';

/**
 * @param {number} page - Aktuelle Seitennummer (1-basiert)
 * @param {number} limit - Einträge pro Seite (Standard: 15)
 * @param {Object} options - React Query Options (enabled, etc.)
 * @returns {Object}
 *   - einheiten: Array der aktuellen Seite
 *   - meta: { total_count, current_page, total_pages, page_size }
 *   - isPending: Initiales Laden oder Fehler
 *   - isPlaceholderData: True wenn alte Daten noch sichtbar (neue laden)
 *   - isFetching: Background Fetch läuft
 *   - error: Fehler-Objekt (falls vorhanden)
 *   - refetch: Manuelle Refresh-Funktion
 */
export function useEinheitenList(page = 1, limit = 15, options = {}) {
  const { data, isPending, error, isPlaceholderData, isFetching, refetch } =
    useQuery({
      queryKey: ['einheiten', 'list', page, limit],
      queryFn: () => secureApi.getEinheitenList(page, limit),
      placeholderData: (previousData) => previousData, // keepPreviousData pattern
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 10 * 60 * 1000, // 10 min (formerly cacheTime)
      ...options,
    });

  return {
    einheiten: data?.data || [],
    meta: data?.meta || {
      total_count: 0,
      current_page: page,
      total_pages: 0,
      page_size: limit,
    },
    isPending,
    isPlaceholderData,
    isFetching,
    error,
    refetch,
  };
}