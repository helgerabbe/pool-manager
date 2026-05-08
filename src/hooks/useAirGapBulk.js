/**
 * useAirGapBulk.js
 *
 * Bulk-Aktion für die vier Air-Gap-Payloads. Orchestriert:
 *   - Plan-Berechnung (lib/airGapBulkPlan.js)
 *   - Schreiben über `bulkUpsertExportPrompts` (1 Roundtrip)
 *   - Cache-Invalidation für `useExportPrompts(einheitId)`
 *
 * Bewusst KEINE Mischung mit dem Legacy-Bulk-Hook (`useMBKBulkGenerate`),
 * damit die beiden Welten unabhängig weiterentwickelt werden können.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  buildAirGapBulkPlan,
  airGapPlanToWritePayload,
  aggregateAirGapPlanByBlock,
} from '@/lib/airGapBulkPlan';

export function useAirGapBulk({
  einheitId,
  einheit,
  stammdaten,
  schulNomenklatur,
  globalPrompts,
  themenfelder,
  lernpakete,
  lernziele,
  phaseAktivitaeten,
  katalogById,
  masterAufgaben,
  allgemeineAufgaben,
  allgemeineAufgabenEbene23,
  prompts,
  tsIndex,
  systemContextHash,
}) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const plan = useMemo(
    () =>
      buildAirGapBulkPlan({
        einheitId,
        einheit,
        stammdaten,
        schulNomenklatur,
        globalPrompts,
        themenfelder,
        lernpakete,
        lernziele,
        phaseAktivitaeten,
        katalogById,
        masterAufgaben,
        allgemeineAufgaben,
        allgemeineAufgabenEbene23,
        prompts,
        tsIndex,
        systemContextHash,
      }),
    [
      einheitId, einheit, stammdaten, schulNomenklatur, globalPrompts,
      themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById,
      masterAufgaben, allgemeineAufgaben, allgemeineAufgabenEbene23,
      prompts, tsIndex, systemContextHash,
    ]
  );

  const summary = useMemo(() => {
    let willWrite = 0, skipCustomized = 0, skipBlocked = 0, skipCurrent = 0;
    for (const it of plan) {
      if (it.status === 'new' || it.status === 'update') willWrite += 1;
      else if (it.status === 'skip-customized') skipCustomized += 1;
      else if (it.status === 'skip-blocked') skipBlocked += 1;
      else if (it.status === 'skip-current') skipCurrent += 1;
    }
    return { willWrite, skipCustomized, skipBlocked, skipCurrent, total: plan.length };
  }, [plan]);

  const blockAggregate = useMemo(() => aggregateAirGapPlanByBlock(plan), [plan]);

  const runBulk = async () => {
    if (running) return;
    setRunning(true);
    try {
      const items = airGapPlanToWritePayload(plan, { systemContextHash });
      if (items.length === 0) {
        toast.info('Nichts zu tun: alle Air-Gap-Payloads sind aktuell.');
        return;
      }
      const res = await base44.functions.invoke('bulkUpsertExportPrompts', {
        einheit_id: einheitId,
        items,
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      const { created = 0, updated = 0, errors = [] } = data || {};
      toast.success(
        `${created + updated} Air-Gap-Payloads geschrieben (${created} neu, ${updated} aktualisiert)` +
        (errors.length > 0 ? ` · ${errors.length} Fehler` : '')
      );
      queryClient.invalidateQueries({ queryKey: ['exportPrompts', einheitId] });
    } catch (e) {
      toast.error('Air-Gap-Bulk fehlgeschlagen: ' + (e?.message || 'unbekannt'));
    } finally {
      setRunning(false);
    }
  };

  return {
    plan,
    summary,
    blockAggregate,
    running,
    runBulk,
  };
}