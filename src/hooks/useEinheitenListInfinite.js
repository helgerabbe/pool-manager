/**
 * useEinheitenListInfinite.js
 *
 * Phase 6.5: Infinite Scroll / "Mehr laden" Pattern
 *
 * Nutzt useInfiniteQuery um Seiten progressiv zu laden:
 * - Benutzer sieht erste 15 Einheiten
 * - Klickt "Weitere laden" → nächste 15 werden dazugefügt
 * - Keine Pagination-Navigation, nur "Mehr laden"-Button
 *
 * Usage:
 * const { einheiten, hasNextPage, fetchNextPage, isFetchingNextPage } = useEinheitenListInfinite(15);
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { secureApi } from '@/api/secureApi';

/**
 * @param {number} limit - Einträge pro Seite (Standard: 15)
 * @param {Object} options - React Query Options
 * @returns {Object}
 *   - einheiten: Flachgelegte Array aller geladenen Einheiten
 *   - hasNextPage: Boolean ob weitere Seiten verfügbar
 *   - fetchNextPage: Funktion um nächste Seite zu laden
 *   - isFetchingNextPage: Boolean ob nächste Seite gerade lädt
 *   - isPending: Initiales Laden
 *   - error: Fehler-Objekt (falls vorhanden)
 */
export function useEinheitenListInfinite(limit = 15, options = {}) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isPending, error } =
    useInfiniteQuery({
      queryKey: ['einheiten', 'infinite', limit],
      queryFn: ({ pageParam = 1 }) =>
        secureApi.getEinheitenList(pageParam, limit),

      // Bestimmt die nächste Seite anhand der Meta-Daten
      getNextPageParam: (lastPage) => {
        const { meta } = lastPage;
        // Wenn aktuelle Seite < total_pages: nächste Seite = current + 1
        // Sonst: undefined (keine weitere Seite)
        return meta.current_page < meta.total_pages
          ? meta.current_page + 1
          : undefined;
      },

      initialPageParam: 1,
      staleTime: 5 * 60 * 1000, // 5 min
      gcTime: 10 * 60 * 1000, // 10 min
      ...options,
    });

  // Flache pages-Array zu einer einzigen Einheiten-Liste
  const einheiten = data?.pages.flatMap((page) => page.data) || [];

  return {
    einheiten,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isPending,
    error,
  };
}