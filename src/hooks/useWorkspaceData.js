import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useWorkspaceData(selectedEinheitId) {
  const { data: einheiten = [], isLoading: einheitenLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list('-created_date', 200),
    enabled: !!selectedEinheitId,
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list('-created_date', 500),
    enabled: !!selectedEinheitId,
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: !!selectedEinheitId,
  });

  const { data: allgemeineAufgabenData = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', selectedEinheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId,
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['mappingBasisziele'],
    queryFn: () => base44.entities.MappingAufgabeBasisziel.list(),
    enabled: !!selectedEinheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', selectedEinheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId,
  });

  const { data: lernpaketAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    enabled: !!selectedEinheitId,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    enabled: !!selectedEinheitId,
  });

  return {
    einheiten,
    lernpakete,
    lernziele,
    aufgaben,
    allgemeineAufgabenData,
    mappings,
    themenfelder,
    lernpaketAktivitaeten,
    aktivitaetenKatalog,
    isLoading: einheitenLoading,
  };
}