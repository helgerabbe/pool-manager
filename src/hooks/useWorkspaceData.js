import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/utils/functionsHelper';
import { base44 } from '@/api/base44Client';

/**
 * useWorkspaceData – Custom Hook für Workspace-Daten
 * Lädt ALLE hierarchischen Daten einer Einheit inkl. Members für RBAC
 */
export function useWorkspaceData(einheitId) {
  // Lade Einheiten-Liste mit Members (für RBAC)
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['einheiten-list-secure'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitenListSecure', { page: 1, limit: 100 });
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });

  // Lade Workspace-Detaildaten wenn einheitId gesetzt
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['workspace-data', einheitId],
    queryFn: async () => {
      if (!einheitId) return null;
      const res = await invokeFunction('getWorkspaceEinheitDataSecure', { einheit_id: einheitId });
      return res.data;
    },
    enabled: !!einheitId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });

  // Kombiniere Daten: Nimm Detail-Daten wenn vorhanden, sonst Liste
  const einheitData = detailData?.data?.einheit;
  const einheitenFromList = listData || [];
  
  // ✅ WICHTIG: Merge members aus der Liste in die detailData
  const einheiten = einheitenFromList.map(e => {
    if (einheitData && e.id === einheitData.id) {
      // Merge detailData members in die Liste
      return { ...e, ...einheitData };
    }
    return e;
  });
  
  // Finde aktive Einheit
  const activeEinheit = einheiten.find(e => e.id === einheitId) || null;
  
  // 🔍 DEBUG: Logge Daten für Audit
  console.log('[useWorkspaceData] Loaded:', {
    einheitId,
    hasDetailData: !!detailData,
    hasEinheitData: !!einheitData,
    activeEinheitMembers: activeEinheit?.members?.length || 0,
    einheitenCount: einheiten.length,
    structuralLock: activeEinheit?.structural_lock || null,
  });

  return {
    einheiten,
    lernpakete: detailData?.data?._flat?.lernpakete || [],
    lernziele: detailData?.data?._flat?.lernziele || [],
    aufgaben: detailData?.data?._flat?.aufgaben || [],
    allgemeineAufgabenData: [],
    mappings: [],
    themenfelder: detailData?.data?.themenfelder || [],
    lernpaketAktivitaeten: [],
    aktivitaetenKatalog: [],
    isLoading: listLoading || detailLoading,
  };
}