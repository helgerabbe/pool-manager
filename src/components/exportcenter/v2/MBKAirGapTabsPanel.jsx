/**
 * MBKAirGapTabsPanel.jsx
 *
 * Neue 6-Tab-Variante des Air-Gap-Übergabe-Centers (Ticket A).
 * Ersetzt das alte Block-Listing aus `MBKAirGapPanel.jsx` durch eine
 * klar strukturierte Reiter-Navigation:
 *
 *   0 · Meta-System-Prompt
 *   1 · Struktur
 *   2 · Aufgaben
 *   3 · Globale KI
 *   4 · Systembausteine (Platzhalter — Ticket B)
 *   5 · KI-Aufgaben
 *
 * Datenladung, Plan-Berechnung und Bulk-Aktionen sind 1:1 aus
 * `MBKAirGapPanel.jsx` übernommen, um die Drift-Logik nicht zu duplizieren.
 * Alle Tabs sind reine Präsentations-Komponenten.
 *
 * Über allen Tabs sichtbar:
 *   - Header mit Anleitung-Button + Bulk-Update-Button
 *   - Operator Action Plan (kontextspezifisch)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { useExportPrompts } from '@/hooks/useExportPrompts';
import { useAirGapBulk } from '@/hooks/useAirGapBulk';
import { buildSourceTimestampIndex } from '@/lib/exportPromptSync';
import {
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentBundle,
  buildTaskContentItemForLernpaket,
  buildTaskContentItemForAllgemeineAufgabe,
  buildMicroPayloadBundle,
  buildMicroPayloadForActivity,
  buildMicroPayloadForAllgemeineAufgabe,
} from '@/lib/mbkAirGapPayloads';
import { computeSystemContextHash } from '@/lib/systemContextHash';
import {
  copyAsMarkdownFence,
  downloadJson,
  downloadZip,
  slugify,
} from '@/lib/airGapClipboard';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';
import { useAirGapHandoverState } from '@/hooks/useAirGapHandoverState';
import { groupTaskItems, groupMicroItems } from '@/lib/airGapBundleGroups';
import { buildOperatorActionPlan } from '@/lib/operatorActionPlan';

import OperatorActionPlanCard from '@/components/export/airgap/OperatorActionPlanCard';
import { META_SYSTEM_PROMPT } from '@/lib/operatorMetaSystemPrompt';

import MetaPromptTab from './tabs/MetaPromptTab';
import StrukturTab from './tabs/StrukturTab';
import AufgabenTab from './tabs/AufgabenTab';
import GlobaleKiTab from './tabs/GlobaleKiTab';
import SystembausteineTab from './tabs/SystembausteineTab';
import KiAufgabenTab from './tabs/KiAufgabenTab';
import TabDriftIndicator from './shared/TabDriftIndicator';

export default function MBKAirGapTabsPanel({ einheitId }) {
  const [activeTab, setActiveTab] = useState('meta');

  const { land, bundesland, schulform } = useSchulStammdaten();
  const stammdaten = { land, bundesland, schulform };

  // ── Daten laden (1:1 aus MBKAirGapPanel) ─────────────────────────────
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

  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Aufgabenbausteine.list();
      return all.filter((a) => paketIds.includes(a.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  // ── Hash & Handover-State ────────────────────────────────────────────
  const currentHash = useMemo(
    () => computeSystemContextHash({ stammdaten, schulNomenklatur, globalPrompts }),
    [stammdaten, schulNomenklatur, globalPrompts]
  );

  const {
    blockStatus,
    deliveredCount,
    totalBlocks,
    setDelivered,
    invalidateBlock,
    reset,
  } = useAirGapHandoverState({ einheitId, currentHash });

  const tsIndex = useMemo(
    () =>
      buildSourceTimestampIndex({
        einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine,
        phaseAktivitaeten, masterAufgaben, allgemeineAufgaben, globalPrompts,
      }),
    [einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, phaseAktivitaeten, masterAufgaben, allgemeineAufgaben, globalPrompts]
  );

  const { prompts: dbPrompts = [] } = useExportPrompts(einheitId);

  const allgemeineAufgabenEbene23 = useMemo(
    () =>
      allgemeineAufgaben.filter(
        (a) => a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt'
      ),
    [allgemeineAufgaben]
  );

  const {
    plan: bulkPlan,
    summary: bulkSummary,
    blockAggregate,
    running: bulkRunning,
    runBulk,
  } = useAirGapBulk({
    einheitId, einheit, stammdaten, schulNomenklatur, globalPrompts,
    themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById,
    masterAufgaben, allgemeineAufgaben, allgemeineAufgabenEbene23,
    prompts: dbPrompts, tsIndex, systemContextHash: currentHash,
  });

  // Stale-Auto-Invalidate (analog zum alten Panel).
  useEffect(() => {
    if (!einheitId) return;
    for (const blockKey of Object.keys(blockAggregate)) {
      if (blockAggregate[blockKey].hasAnyStale && blockStatus[blockKey]?.rawDelivered) {
        invalidateBlock(blockKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockAggregate, einheitId]);

  // ── Payload-Builder ──────────────────────────────────────────────────
  const buildSysCtx = () =>
    buildSystemContextPayload({ stammdaten, schulNomenklatur, globalPrompts, systemContextHash: currentHash });

  const buildStructure = () =>
    buildStructurePayload({
      einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
      katalogById, allgemeineAufgaben, systemContextHash: currentHash,
    });

  const taskBundle = useMemo(
    () =>
      buildTaskContentBundle({
        einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById,
        masterAufgaben, allgemeineAufgabenEbene23, systemContextHash: currentHash,
      }),
    [einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById, masterAufgaben, allgemeineAufgabenEbene23, currentHash]
  );

  const microBundle = useMemo(
    () =>
      buildMicroPayloadBundle({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
        katalogById, allgemeineAufgaben, systemContextHash: currentHash,
      }),
    [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben, currentHash]
  );

  // Item-Listen analog zum alten Panel.
  const taskItems = useMemo(() => {
    const zieleByPaket = new Map();
    for (const lz of lernziele) {
      if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
      zieleByPaket.get(lz.lernpaket_id).push(lz);
    }
    const phasenByPaket = new Map();
    for (const pa of phaseAktivitaeten) {
      if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
      phasenByPaket.get(pa.lernpaket_id).push(pa);
    }
    const masterByPaket = new Map();
    for (const m of masterAufgaben) {
      if (!masterByPaket.has(m.lernpaket_id)) masterByPaket.set(m.lernpaket_id, []);
      masterByPaket.get(m.lernpaket_id).push(m);
    }

    const lpItems = [...lernpakete]
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .map((lp) => ({
        key: `mbk-task-lp::${lp.id}`,
        label: `📦 ${lp.titel_des_pakets || '(ohne Titel)'}`,
        subLabel: 'Lernpaket',
        build: () =>
          buildTaskContentItemForLernpaket({
            lernpaket: lp,
            lernziele: zieleByPaket.get(lp.id) || [],
            phaseAktivitaeten: phasenByPaket.get(lp.id) || [],
            katalogById,
            masterAufgaben: masterByPaket.get(lp.id) || [],
          }),
        slug: slugify(lp.titel_des_pakets, lp.id),
      }));

    const aaItems = allgemeineAufgabenEbene23.map((aa) => ({
      key: `mbk-task-aa::${aa.id}`,
      label: `🎯 ${aa.titel || '(ohne Titel)'}`,
      subLabel: aa.anforderungsebene,
      build: () => buildTaskContentItemForAllgemeineAufgabe({ aufgabe: aa }),
      slug: slugify(aa.titel, aa.id),
    }));

    return [...lpItems, ...aaItems];
  }, [lernpakete, lernziele, phaseAktivitaeten, masterAufgaben, allgemeineAufgabenEbene23, katalogById]);

  const microItems = useMemo(() => {
    const themenfeldById = new Map(themenfelder.map((tf) => [tf.id, tf]));
    const lernpaketById = new Map(lernpakete.map((lp) => [lp.id, lp]));
    const phasenByPaket = new Map();
    for (const pa of phaseAktivitaeten) {
      if (!phasenByPaket.has(pa.lernpaket_id)) phasenByPaket.set(pa.lernpaket_id, []);
      phasenByPaket.get(pa.lernpaket_id).push(pa);
    }
    const zieleByPaket = new Map();
    for (const lz of lernziele) {
      if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
      zieleByPaket.get(lz.lernpaket_id).push(lz);
    }

    const items = [];
    for (const pa of phaseAktivitaeten) {
      if (pa.erstellungs_modus !== 'ki') continue;
      const lp = lernpaketById.get(pa.lernpaket_id) || null;
      const tf = lp?.themenfeld_id ? themenfeldById.get(lp.themenfeld_id) || null : null;
      const katalog = katalogById.get(pa.aktivitaet_id);
      items.push({
        key: `mbk-micro-pa::${pa.id}`,
        label: `🤖 ${katalog?.name || 'Aktivität'}`,
        subLabel: lp?.titel_des_pakets || '—',
        slug: slugify(`${katalog?.name || 'aktivitaet'}-${pa.id}`, pa.id),
        build: () =>
          buildMicroPayloadForActivity({
            einheit, aktivitaet: pa, lernpaket: lp, themenfeld: tf,
            phaseAktivitaetenInPaket: phasenByPaket.get(pa.lernpaket_id) || [],
            lernziele: zieleByPaket.get(pa.lernpaket_id) || [],
            katalogById, systemContextHash: currentHash,
          }),
      });
    }
    for (const aa of allgemeineAufgaben) {
      if (aa.erstellungs_modus !== 'ki') continue;
      const tf = aa.themenfeld_id ? themenfeldById.get(aa.themenfeld_id) || null : null;
      items.push({
        key: `mbk-micro-aa::${aa.id}`,
        label: `🤖 ${aa.titel || 'Aufgabe'}`,
        subLabel: aa.anforderungsebene || 'Allgemeine Aufgabe',
        slug: slugify(aa.titel, aa.id),
        build: () =>
          buildMicroPayloadForAllgemeineAufgabe({
            einheit, aufgabe: aa, themenfeld: tf, systemContextHash: currentHash,
          }),
      });
    }
    return items;
  }, [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, allgemeineAufgaben, katalogById, currentHash]);

  // ── Aktion-Helfer ────────────────────────────────────────────────────
  const baseSlug = slugify(einheit?.titel_der_einheit, einheitId || 'einheit');

  const safeAction = async (fn, successMsg) => {
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err?.message || 'Aktion fehlgeschlagen.');
    }
  };
  const handleCopy = (payload) => safeAction(() => copyAsMarkdownFence(payload), 'In Zwischenablage kopiert.');
  const handleDownload = (payload, name) => safeAction(() => Promise.resolve(downloadJson(payload, name)), null);
  const handleDownloadZip = (files, name) => safeAction(() => downloadZip(files, name), null);

  // Gruppen pro Tab.
  const taskGroups = useMemo(
    () => groupTaskItems(taskItems, { themenfelder, lernpakete, allgemeineAufgaben }),
    [taskItems, themenfelder, lernpakete, allgemeineAufgaben]
  );
  const microGroups = useMemo(
    () => groupMicroItems(microItems, {
      themenfelder, lernpakete, allgemeineAufgaben, phaseAktivitaeten,
    }),
    [microItems, themenfelder, lernpakete, allgemeineAufgaben, phaseAktivitaeten]
  );

  const handleDownloadGroupZip = (group, blockSlug) =>
    handleDownloadZip(
      group.items.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
      `mbk-${blockSlug}_${baseSlug}_${group.key.replace('::', '-')}.zip`
    );

  // ── Action Plan ──────────────────────────────────────────────────────
  const actionPlan = useMemo(
    () =>
      buildOperatorActionPlan({
        plan: bulkPlan || [],
        existingPrompts: dbPrompts || [],
        einheitId, lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById,
      }),
    [bulkPlan, dbPrompts, einheitId, lernpakete, allgemeineAufgaben, phaseAktivitaeten, katalogById]
  );

  const handleCopyMetaPrompt = () =>
    safeAction(
      () => navigator.clipboard.writeText(META_SYSTEM_PROMPT),
      'Meta-System-Prompt in Zwischenablage kopiert.'
    );

  // Plan-Lookup pro Item-Key → für SyncStatusBadge in den Listen.
  const itemPlanByKey = useMemo(() => {
    const m = new Map();
    for (const it of bulkPlan || []) m.set(it.key, it);
    return m;
  }, [bulkPlan]);
  const itemPlanLookup = (key) => itemPlanByKey.get(key) || null;

  // Plan-Items pro Tab → für Reiter-Indikatoren.
  const tabCounts = useMemo(() => {
    const counts = {
      'mbk_structure_payload': { newCount: 0, staleCount: 0 },
      'mbk_task_content_payload': { newCount: 0, staleCount: 0 },
      'mbk_system_context': { newCount: 0, staleCount: 0 },
      'mbk_micro_payload': { newCount: 0, staleCount: 0 },
    };
    for (const it of bulkPlan || []) {
      const c = counts[it.section];
      if (!c) continue;
      if (it.status === 'new') c.newCount += 1;
      else if (it.status === 'update') c.staleCount += 1;
    }
    return counts;
  }, [bulkPlan]);

  const structurePlanItem = useMemo(
    () => (bulkPlan || []).find((it) => it.section === 'mbk_structure_payload') || null,
    [bulkPlan]
  );
  const systemPlanItem = useMemo(
    () => (bulkPlan || []).find((it) => it.section === 'mbk_system_context') || null,
    [bulkPlan]
  );

  // ── Empty-State ──────────────────────────────────────────────────────
  if (!einheitId || !einheit) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Keine Einheit ausgewählt — der Air-Gap-Übergabe-Modus benötigt eine konkrete Einheit.
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Kompakte Aktionsleiste — kein eigener Karten-Header mehr,
          die globale Anleitung sitzt im Export-Center-Header. */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="font-medium tabular-nums">{deliveredCount}/{totalBlocks}</span>
          <span className="text-muted-foreground text-xs">übergeben</span>
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={runBulk}
          disabled={bulkRunning || bulkSummary.willWrite === 0}
          className="gap-1.5"
          title={
            bulkSummary.willWrite === 0
              ? 'Alle Air-Gap-Payloads sind aktuell — kein Re-Write nötig.'
              : `${bulkSummary.willWrite} Payload(s) werden in die DB geschrieben.`
          }
        >
          {bulkRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {bulkSummary.willWrite === 0
            ? 'Alle aktuell'
            : `${bulkSummary.willWrite} regenerieren`}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Zurücksetzen
        </Button>
      </div>

      {/* Operator Action Plan (kontextspezifisch) */}
      <OperatorActionPlanCard
        actionPlan={actionPlan}
        onCopyMetaPrompt={handleCopyMetaPrompt}
      />

      {/* Tab-Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="meta" className="text-xs">
            <span className="font-mono mr-1 opacity-60">0·</span>
            Meta
          </TabsTrigger>
          <TabsTrigger value="struktur" className="text-xs">
            <span className="font-mono mr-1 opacity-60">1·</span>
            Struktur
            <TabDriftIndicator {...tabCounts.mbk_structure_payload} />
          </TabsTrigger>
          <TabsTrigger value="aufgaben" className="text-xs">
            <span className="font-mono mr-1 opacity-60">2·</span>
            Aufgaben
            <TabDriftIndicator {...tabCounts.mbk_task_content_payload} />
          </TabsTrigger>
          <TabsTrigger value="globale-ki" className="text-xs">
            <span className="font-mono mr-1 opacity-60">3·</span>
            Globale KI
            <TabDriftIndicator {...tabCounts.mbk_system_context} />
          </TabsTrigger>
          <TabsTrigger value="systembausteine" className="text-xs">
            <span className="font-mono mr-1 opacity-60">4·</span>
            Systembausteine
          </TabsTrigger>
          <TabsTrigger value="ki-aufgaben" className="text-xs">
            <span className="font-mono mr-1 opacity-60">5·</span>
            KI-Aufgaben
            <TabDriftIndicator {...tabCounts.mbk_micro_payload} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="mt-4">
          <MetaPromptTab />
        </TabsContent>

        <TabsContent value="struktur" className="mt-4">
          <StrukturTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            planItem={structurePlanItem}
            onToggleDelivered={(v) => setDelivered('structure', v)}
            onCopy={() => handleCopy(buildStructure())}
            onDownload={() => handleDownload(buildStructure(), `mbk-structure_${baseSlug}.json`)}
          />
        </TabsContent>

        <TabsContent value="aufgaben" className="mt-4">
          <AufgabenTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            taskItems={taskItems}
            taskGroups={taskGroups}
            taskBundle={taskBundle}
            itemPlanLookup={itemPlanLookup}
            onToggleDelivered={(v) => setDelivered('task_content', v)}
            onCopy={() => handleCopy(taskBundle)}
            onDownload={() => handleDownload(taskBundle, `mbk-task-content_${baseSlug}.json`)}
            onDownloadBundle={() =>
              handleDownloadZip(
                [
                  { name: `_bundle.json`, content: taskBundle },
                  ...taskItems.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
                ],
                `mbk-task-content_${baseSlug}.zip`
              )
            }
            onCopyItem={(it) => handleCopy(it.build())}
            onDownloadItem={(it) =>
              handleDownload(it.build(), `mbk-task-content_${baseSlug}_${it.slug}.json`)
            }
            onDownloadGroupZip={(g) => handleDownloadGroupZip(g, 'task-content')}
          />
        </TabsContent>

        <TabsContent value="globale-ki" className="mt-4">
          <GlobaleKiTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            planItem={systemPlanItem}
            onToggleDelivered={(v) => setDelivered('system_context', v)}
            onCopy={() => handleCopy(buildSysCtx())}
            onDownload={() => handleDownload(buildSysCtx(), `mbk-system-context_${baseSlug}.json`)}
          />
        </TabsContent>

        <TabsContent value="systembausteine" className="mt-4">
          <SystembausteineTab />
        </TabsContent>

        <TabsContent value="ki-aufgaben" className="mt-4">
          <KiAufgabenTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            microItems={microItems}
            microGroups={microGroups}
            itemPlanLookup={itemPlanLookup}
            onToggleDelivered={(v) => setDelivered('micro', v)}
            onCopy={() => handleCopy(microBundle)}
            onDownload={() => handleDownload(microBundle, `mbk-micro_${baseSlug}.json`)}
            onDownloadBundle={() =>
              handleDownloadZip(
                [
                  { name: `_bundle.json`, content: microBundle },
                  ...microItems.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
                ],
                `mbk-micro_${baseSlug}.zip`
              )
            }
            onCopyItem={(it) => handleCopy(it.build())}
            onDownloadItem={(it) =>
              handleDownload(it.build(), `mbk-micro_${baseSlug}_${it.slug}.json`)
            }
            onDownloadGroupZip={(g) => handleDownloadGroupZip(g, 'micro')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}