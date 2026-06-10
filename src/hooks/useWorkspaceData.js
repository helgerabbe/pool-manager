import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeFunction } from '@/utils/functionsHelper';
import { base44 } from '@/api/base44Client';

function flattenWorkspaceTree(themenfelder = []) {
  const lernpakete = [];
  const lernziele = [];
  const aufgaben = [];

  for (const themenfeld of themenfelder) {
    for (const lernpaket of themenfeld.lernpakete || []) {
      lernpakete.push(lernpaket);

      for (const lernziel of lernpaket.lernziele || []) {
        lernziele.push(lernziel);
        aufgaben.push(...(lernziel.aufgaben || []));
      }
    }
  }

  return { lernpakete, lernziele, aufgaben };
}

/**
 * useWorkspaceData – Custom Hook für Workspace-Daten
 * Lädt ALLE hierarchischen Daten einer Einheit inkl. Members für RBAC
 */
export function useWorkspaceData(einheitId, isStructuralEditingActive = false, isBasismodul = false) {
  const queryClient = useQueryClient();

  // 🩹 Stale-Cache-Schutz: Beim Wechsel der Einheit (oder erstem Mount) einmal
  // einen frischen Server-Stand erzwingen. Hintergrund: Eine ältere
  // Backend-Version lieferte zeitweise leere Lernziele/Themenfelder; diese
  // veraltete Antwort konnte im React-Query-Cache (staleTime 5 Min) hängen
  // bleiben und führte zu „0 Lernziele" überall. Außerhalb des Edit-Modus
  // holen wir die Detaildaten daher beim Einheitswechsel aktiv neu.
  useEffect(() => {
    if (!einheitId || isStructuralEditingActive) return;
    queryClient.refetchQueries({ queryKey: ['workspace-data', einheitId], type: 'active' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [einheitId]);

  // ✅ Lade Einheiten-Liste mit Members (für RBAC)
  // - Silent Polling: refetchInterval 0, refetchOnWindowFocus false
  // - Nur beim initialen Load: isLoading wird gezeigt
  // - Hintergrund-Updates: isFetching läuft stillschweigend ab
  const { data: listData, isLoading: listLoading, isFetching: listIsFetching } = useQuery({
    queryKey: ['einheiten-list-secure', isBasismodul ? 'basismodule' : 'einheiten'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitenListSecure', {
        page: 1,
        limit: 100,
        scope: isBasismodul ? 'basismodule' : 'einheiten',
      });
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
      // 🛡️ Sicherheitsnetz gegen "mal da, mal weg":
      // Das Backend wirft jetzt bei transienten Read-Fehlern (statt leere
      // Daten zu liefern). Hier prüfen wir zusätzlich, ob die Antwort
      // strukturell plausibel ist. Eine Antwort ohne success-Flag oder ohne
      // einheit-Objekt ist KEINE valide Antwort → Fehler werfen, damit
      // React Query erneut versucht und NICHT den leeren Stand cacht.
      const payload = res?.data;
      if (!payload || payload.success !== true || !payload.data?.einheit?.id) {
        throw new Error('Unvollständige Workspace-Antwort – wird erneut geladen.');
      }
      return payload;
    },
    enabled: !!einheitId, // ✅ IMMER aktiviert (auch im Read-Only-Modus!)
    // 🛡️ Transiente Fehler automatisch erneut versuchen (statt leeren Stand
    // anzuzeigen). 2 Wiederholungen mit kurzem Backoff reichen für die
    // gelegentlichen Kaltstart-/Netzwerk-Hiccups, die das Problem ausgelöst haben.
    retry: 2,
    retryDelay: (attempt) => 300 * (attempt + 1),
    // Edit-Mode: Cache einfrieren (kein Refetch, damit Eingaben nicht überschrieben werden).
    // Read-Mode: staleTime 0 → frischer Server-Stand bei jedem Mount/Refetch,
    // verhindert das Hängenbleiben veralteter (leerer) Antworten.
    staleTime: isStructuralEditingActive ? Infinity : 0,
    // 🩹 KRITISCH (Bug "Lernziele verschwinden in Tab 2/3/4, sind aber in Tab 5 da"):
    // Tab 5 (TaskCreationView) lädt Lernziele über eigene Queries und ist daher
    // immer frisch. Die Tabs 2/3/4 hängen alle an DIESER geteilten workspace-data-
    // Query. Bei einem Tab-Wechsel (gleiche Einheit) wird die Komponente, die den
    // Hook nutzt, neu verwendet, aber React Query refetcht ohne diese Direktive
    // NICHT automatisch – der (evtl. veraltete/leere) Cache-Stand bleibt sichtbar.
    // refetchOnMount:'always' erzwingt im Read-Modus bei jedem Mount einen frischen
    // Server-Stand. Im Edit-Modus bleibt der Cache eingefroren (false), damit
    // laufende Eingaben nicht überschrieben werden.
    refetchOnMount: isStructuralEditingActive ? false : 'always',
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

  // 🩹 Bug-Fix ("Einheit mal da, mal weg"): Wenn die Detaildaten der geöffneten
  // Einheit geladen sind, sie aber (noch) NICHT in der gecachten Listen-Query
  // steht (z. B. wegen 5-Min-Cache, Pagination-Timing oder einer veralteten
  // RBAC-Antwort), würde die Einheit fälschlich als "nicht vorhanden" gelten.
  // Die Detail-Query ist die verlässliche Quelle für die geöffnete Einheit →
  // hängen wir sie an, falls die Liste sie nicht enthält.
  if (einheitData?.id && !einheiten.some(e => e.id === einheitData.id)) {
    einheiten.push(einheitData);
  }

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

  const themenfelder = detailData?.data?.themenfelder || [];
  const flatData = flattenWorkspaceTree(themenfelder);

  // 🚪 DETAILDATEN-GATE (2026-06-06):
  // Die Einheit darf erst geöffnet werden, wenn die Detaildaten (Grundgerüst
  // + Lernziele/Themenfelder) wirklich aus der DB da sind. Hintergrund: Beim
  // (Re)Mount läuft ein Hintergrund-Fetch; währenddessen wäre kurzzeitig der
  // alte/leere Cache sichtbar → „Lernziele plötzlich weg". Statt das leere
  // Zwischenbild zu zeigen, signalisieren wir „noch nicht bereit", damit die
  // Workspace-Seite ein Lade-Gate rendert.
  //
  // detailReady = true ⟺
  //   • es gibt eine ausgewählte Einheit, UND
  //   • die geladenen Detaildaten gehören GENAU zu dieser Einheit (kein Stale
  //     vom vorherigen Einheitswechsel).
  //
  // WICHTIG: Wir koppeln das Gate bewusst NUR an „passende Daten vorhanden",
  // nicht an `detailIsFetching`. Sonst würde jeder harmlose Hintergrund-Refetch
  // (z. B. beim Tab-Wechsel) das Lade-Gate kurz aufblitzen lassen, obwohl die
  // korrekten Daten längst im Cache liegen. Das Gate blockiert also nur beim
  // erstmaligen Öffnen bzw. beim Einheitswechsel, bis erstmals passende
  // Detaildaten zu DIESER Einheit da sind.
  const detailReady = !!einheitId && detailData?.data?.einheit?.id === einheitId;

  return {
    einheiten,
    lernpakete: flatData.lernpakete,
    lernziele: flatData.lernziele,
    aufgaben: flatData.aufgaben,
    allgemeineAufgabenData: [],
    mappings: [],
    themenfelder,
    lernpaketAktivitaeten: [],
    aktivitaetenKatalog: [],
    // ✅ KRITISCH: Trenne Initial Load (isLoading) von Hintergrund-Fetches (isFetching)
    // - isLoading: Spinner für die UI (nur beim allerersten Laden)
    // - isFetching: Still/unsichtbar (Hintergrund-Updates)
    isLoading: listLoading || detailLoading,
    isFetching: listIsFetching || detailIsFetching, // ✅ NEU: Hintergrund-Updates (ungenutzt, da Silent)
    // 🚪 Bereitschafts-Signal der Detaildaten (siehe oben) — Workspace nutzt
    // das, um die Einheit erst NACH vollständigem DB-Load zu öffnen.
    detailReady,
  };
}