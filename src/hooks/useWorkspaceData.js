import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getAllEinheiten } from '@/services/EinheitenService';
import { getAllLernpakete } from '@/services/LernpaketService';
import { getAllLernziele } from '@/services/LernzielService';
import { getAllAufgabenbausteine } from '@/services/AufgabenbausteinService';
import { getAllLernpaketAktivitaeten, getAktivitaetenKatalog } from '@/services/AktivitaetService';
import { getThemenfelderByEinheit } from '@/services/ThemenfeldService';

export function useWorkspaceData(selectedEinheitId) {
  const { data: einheiten = [], isLoading: einheitenLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => getAllEinheiten(),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => getAllLernpakete(),
    enabled: !!selectedEinheitId,
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => getAllLernziele(),
    enabled: !!selectedEinheitId,
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => getAllAufgabenbausteine(),
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
    queryFn: () => getThemenfelderByEinheit(selectedEinheitId),
    enabled: !!selectedEinheitId,
  });

  const { data: lernpaketAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => getAllLernpaketAktivitaeten(),
    enabled: !!selectedEinheitId,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => getAktivitaetenKatalog(),
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