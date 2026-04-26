/**
 * useEinheitenMetrics.js
 *
 * Lädt Volumen + Dashboard-Fortschritte für eine Liste von Einheiten in einem Request.
 * Wird in der Einheiten-Übersicht verwendet (siehe pages/EinheitenListe).
 *
 * Returns:
 *   { metrics: Record<einheitId, { volume, progress }>, isLoading, error }
 *
 * Caching: 60s staleTime – Liste bleibt responsiv, aber neue Saves werden zeitnah sichtbar.
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const EMPTY_METRICS = {};

export function useEinheitenMetrics(einheitIds) {
  // Stabile Sortierung der Keys für deterministisches Caching.
  const ids = Array.isArray(einheitIds) ? [...einheitIds].sort() : [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['einheitenMetrics', ids],
    queryFn: async () => {
      if (ids.length === 0) return { metrics: {} };
      const res = await base44.functions.invoke('getEinheitenMetricsSecure', { einheitIds: ids });
      return res?.data || { metrics: {} };
    },
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });

  return {
    metrics: data?.metrics || EMPTY_METRICS,
    isLoading,
    error,
  };
}