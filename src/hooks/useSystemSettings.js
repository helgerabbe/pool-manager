import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const WARTUNGSMODUS_KEY = 'wartungsmodus';

/**
 * Zentraler Hook für alle Lookup-Tabellen und Systemeinstellungen.
 *
 * Liefert:
 *  - faecher, jahrgaenge, bausteinTypen, phasen  → nur aktive Einträge (für Dropdowns)
 *  - wartungsmodus  → Boolean
 *  - setWartungsmodus(bool)  → Toggle für Admins
 *
 * Die raw-Listen (inkl. inaktiver) werden separat für die Admin-UI bereitgestellt.
 */
export function useSystemSettings() {
  const queryClient = useQueryClient();

  const { data: faecherRaw = [], isLoading: loadingFaecher } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('reihenfolge'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: jahrgaengeRaw = [], isLoading: loadingJahrgaenge } = useQuery({
    queryKey: ['lookupJahrgaenge'],
    queryFn: () => base44.entities.LookupJahrgaenge.list('reihenfolge'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: bausteinTypenRaw = [], isLoading: loadingBausteine } = useQuery({
    queryKey: ['lookupBausteinTypen'],
    queryFn: () => base44.entities.LookupBausteinTypen.list('reihenfolge'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: phasenRaw = [], isLoading: loadingPhasen } = useQuery({
    queryKey: ['lookupPhasen'],
    queryFn: () => base44.entities.LookupPhasen.list('bezeichnung'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: systemSettings = [] } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => base44.entities.Systemeinstellungen.list(),
    staleTime: 60 * 1000, // 1 min — öfter prüfen
  });

  const wartungsmodusRecord = systemSettings.find(s => s.schluessel === WARTUNGSMODUS_KEY);
  const wartungsmodus = wartungsmodusRecord?.wert_boolean === true;

  const setWartungsmodus = useMutation({
    mutationFn: async (aktiv) => {
      if (wartungsmodusRecord) {
        return base44.entities.Systemeinstellungen.update(wartungsmodusRecord.id, { wert_boolean: aktiv });
      }
      return base44.entities.Systemeinstellungen.create({ schluessel: WARTUNGSMODUS_KEY, wert_boolean: aktiv });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemeinstellungen'] }),
  });

  return {
    isLoading: loadingFaecher || loadingJahrgaenge || loadingBausteine || loadingPhasen,
    wartungsmodus,
    isWartungsmodusLoading: setWartungsmodus.isPending,
    setWartungsmodus: (aktiv) => setWartungsmodus.mutate(aktiv),

    // Gefiltert (nur aktive) — für Dropdowns in der App
    faecher:      faecherRaw.filter(f => f.ist_aktiv !== false).map(f => f.name),
    jahrgaenge:   jahrgaengeRaw.filter(j => j.ist_aktiv !== false).map(j => j.bezeichnung),
    bausteinTypen: bausteinTypenRaw.filter(b => b.ist_aktiv !== false).map(b => b.name),
    phasen:       phasenRaw.filter(p => p.ist_aktiv !== false),

    // Roh (inkl. inaktiver) — für Admin-CRUD-Tabellen
    faecherRaw,
    jahrgaengeRaw,
    bausteinTypenRaw,
    phasenRaw,
  };
}