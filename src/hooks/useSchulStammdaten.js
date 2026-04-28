/**
 * useSchulStammdaten.js
 *
 * Hook für die drei globalen Schul-Stammdaten (Land, Bundesland, Schulform),
 * die als Eingabe für den Nukleus-Prompt im MBK-Export-Generator verwendet werden.
 *
 * Persistenz: Systemeinstellungen-Entity mit den Schlüsseln
 *   - 'system_land'        → wert_text
 *   - 'system_bundesland'  → wert_text
 *   - 'system_schulform'   → wert_text
 *
 * Liefert sowohl die aktuellen Werte als auch eine Mutation zum Speichern.
 * Upsert: Existiert ein Eintrag mit dem Schlüssel, wird er aktualisiert,
 * sonst neu angelegt.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const KEYS = {
  land: 'system_land',
  bundesland: 'system_bundesland',
  schulform: 'system_schulform',
};

export function useSchulStammdaten() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => base44.entities.Systemeinstellungen.list(),
    staleTime: 60 * 1000,
  });

  const findRecord = (schluessel) => settings.find((s) => s.schluessel === schluessel);
  const land = findRecord(KEYS.land)?.wert_text || '';
  const bundesland = findRecord(KEYS.bundesland)?.wert_text || '';
  const schulform = findRecord(KEYS.schulform)?.wert_text || '';

  const saveMutation = useMutation({
    mutationFn: async ({ schluessel, wert_text }) => {
      const existing = findRecord(schluessel);
      if (existing) {
        return base44.entities.Systemeinstellungen.update(existing.id, { wert_text });
      }
      return base44.entities.Systemeinstellungen.create({ schluessel, wert_text });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemeinstellungen'] }),
  });

  return {
    isLoading,
    land,
    bundesland,
    schulform,
    isSaving: saveMutation.isPending,
    setLand: (v) => saveMutation.mutate({ schluessel: KEYS.land, wert_text: v }),
    setBundesland: (v) => saveMutation.mutate({ schluessel: KEYS.bundesland, wert_text: v }),
    setSchulform: (v) => saveMutation.mutate({ schluessel: KEYS.schulform, wert_text: v }),
  };
}