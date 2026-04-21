import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeFunction } from '@/utils/functionsHelper';
import { base44 } from '@/api/base44Client';

/**
 * useWorkspaceData – Custom Hook für Workspace-Daten
 * Lädt ALLE hierarchischen Daten einer Einheit inkl. Members für RBAC
 */
export function useWorkspaceData(einheitId, isStructuralEditingActive = false) {
  // ✅ Lade Einheiten-Liste mit Members (für RBAC)
  // - Silent Polling: refetchInterval 0, refetchOnWindowFocus false
  // - Nur beim initialen Load: isLoading wird gezeigt
  // - Hintergrund-Updates: isFetching läuft stillschweigend ab
  const { data: listData, isLoading: listLoading, isFetching: listIsFetching } = useQuery({
    queryKey: ['einheiten-list-secure'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitenListSecure', { page: 1, limit: 100 });
      return res.data?.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 Minuten
    refetchInterval: 0, // ✅ Kein automatisches Polling
    refetchOnWindowFocus: false, // ✅ Nicht bei Tab-Wechsel neuladern
    refetchOnReconnect: false, // ✅ Nicht bei Reconnect neuladern
  });

  // ✅ Lade Workspace-Detaildaten
  // - Edit-Mode: Struktur-Polling pausiert (Nutzer hat Lock, kann sich nicht ändern)
  // - Read-Mode: Silent Polling für Live-Updates von anderen Nutzern
  // - Nur initiales Laden zeigt Spinner
  const { data: detailData, isLoading: detailLoading, isFetching: detailIsFetching } = useQuery({
    queryKey: ['workspace-data', einheitId],
    queryFn: async () => {
      if (!einheitId) return null;
      const res = await invokeFunction('getWorkspaceEinheitDataSecure', { einheit_id: einheitId });
      return res.data;
    },
    enabled: !!einheitId, // ✅ IMMER aktiviert (auch im Read-Only-Modus!)
    staleTime: isStructuralEditingActive ? Infinity : 5 * 60 * 1000, // ✅ Im Edit-Mode: Cache verwenden, keine Refetches
    refetchInterval: 0, // ✅ Kein automatisches Interval-Polling
    refetchOnWindowFocus: false, // ✅ Silent
    refetchOnReconnect: false, // ✅ Silent
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
  


  // ✅ SMART POLLING: Manuelles Background Refetch im Read-Only-Modus
  // Nutzer mit Lock sehen keine Hintergrund-Updates (staleTime=Infinity)
  // Andere Nutzer können je nach Bedarf manuell refetchen
  // (für Struktur-Tab: useEffect könnte alle 30s refetch() aufrufen – aber SILENT)
  useEffect(() => {
    // Nur im Read-Only-Modus (kein Structural Lock)
    if (einheitId && typeof isStructuralEditingActive !== 'undefined' && !isStructuralEditingActive) {
      // Könnte hier ein stilles Polling aktivieren (z.B. alle 30 Sekunden)
      // für jetzt: manuelles Refetch bei Bedarf über useQueryClient
      // Beispiel: queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId], refetchType: 'stale' })
    }
  }, [einheitId, isStructuralEditingActive]);

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
    // ✅ KRITISCH: Trenne Initial Load (isLoading) von Hintergrund-Fetches (isFetching)
    // - isLoading: Spinner für die UI (nur beim allerersten Laden)
    // - isFetching: Still/unsichtbar (Hintergrund-Updates)
    isLoading: listLoading || detailLoading,
    isFetching: listIsFetching || detailIsFetching, // ✅ NEU: Hintergrund-Updates (ungenutzt, da Silent)
  };
}