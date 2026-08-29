import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useAktivitaetenKatalogMap
 * ─────────────────────────
 * Lädt den Aktivitätenkatalog einmal und gibt ihn als Map `id → Record`
 * zurück. Gedacht für Stellen, die zu einer gespeicherten `aktivitaet_id`
 * den Namen brauchen, um über `lib/aktivitaetSeitenMap` die passende
 * Schüler-Seite zu finden — etwa Katalog-Schritte einer Aufgabensequenz.
 *
 * Der Katalog ändert sich selten, deshalb großzügig gecacht.
 */
export default function useAktivitaetenKatalogMap({ enabled = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ['aktivitaetenKatalogMap'],
    queryFn: async () => {
      const liste = await base44.entities.AktivitaetenKatalog.list();
      const map = {};
      (liste || []).forEach((k) => { if (k?.id) map[k.id] = k; });
      return map;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });

  return { katalogMap: data || {}, isLoading };
}
