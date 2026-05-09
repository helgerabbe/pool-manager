/**
 * useOperatorActionPlan.js
 *
 * Lädt alle für den Operator Action Plan einer Einheit nötigen Daten und
 * liefert das fertige Plan-Objekt + die Bulk-Plan-Items zurück. Wird vom
 * Anleitungs-Modal aufgerufen, sobald eine Einheit ausgewählt ist.
 *
 * Bewusst eigenständig (nicht via MBKAirGapTabsPanel-Refactor), damit das
 * Modal unabhängig vom Tabs-Panel rendern kann und die Daten erst dann
 * geladen werden, wenn der Operator wirklich nachschlägt.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useExportPrompts } from '@/hooks/useExportPrompts';
import { useAirGapBulk } from '@/hooks/useAirGapBulk';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';
import { computeSystemContextHash } from '@/lib/systemContextHash';
import { buildSourceTimestampIndex } from '@/lib/exportPromptSync';
import { buildOperatorActionPlan } from '@/lib/operatorActionPlan';

export function useOperatorActionPlan(einheitId) {
  const { land, bundesland, schulform } = useSchulStammdaten();
  const stammdaten = { land, bundesland, schulform };

  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketIds = useMemo(() => lernpakete.map((p) => p.id), [lernpakete]);

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Lernziele.list();
      return all.filter((z) => paketIds.includes(z.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.MasterAufgabe.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Aufgabenbausteine.list();
      return all.filter((a) => paketIds.includes(a.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const katalogById = useMemo(() => {
    const m = new Map();
    for (const k of aktivitaetenKatalog) m.set(k.id, k);
    return m;
  }, [aktivitaetenKatalog]);

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: schulNomenklatur = [] } = useQuery({
    queryKey: ['schulNomenklatur'],
    queryFn: () => base44.entities.SchulNomenklatur.list('-updated_date', 200),
    staleTime: 60_000,
  });

  const { data: globalPrompts = [] } = useQuery({
    queryKey: ['mbkGlobalPrompts'],
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  const allgemeineAufgabenEbene23 = useMemo(
    () =>
      allgemeineAufgaben.filter(
        (a) => a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt'
      ),
    [allgemeineAufgaben]
  );

  const currentHash = useMemo(
    () => computeSystemContextHash({ stammdaten, schulNomenklatur, globalPrompts }),
    [stammdaten, schulNomenklatur, globalPrompts]
  );

  const tsIndex = useMemo(
    () =>
      buildSourceTimestampIndex({
        einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine,
        phaseAktivitaeten, masterAufgaben, allgemeineAufgaben, globalPrompts,
      }),
    [einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, phaseAktivitaeten, masterAufgaben, allgemeineAufgaben, globalPrompts]
  );

  const { prompts: dbPrompts = [] } = useExportPrompts(einheitId);

  const { plan: bulkPlan } = useAirGapBulk({
    einheitId, einheit, stammdaten, schulNomenklatur, globalPrompts,
    themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById,
    masterAufgaben, allgemeineAufgaben, allgemeineAufgabenEbene23,
    prompts: dbPrompts, tsIndex, systemContextHash: currentHash,
  });

  const actionPlan = useMemo(
    () =>
      buildOperatorActionPlan({
        plan: bulkPlan || [],
        existingPrompts: dbPrompts || [],
        einheitId, lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById,
      }),
    [bulkPlan, dbPrompts, einheitId, lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById]
  );

  return { actionPlan, einheit };
}