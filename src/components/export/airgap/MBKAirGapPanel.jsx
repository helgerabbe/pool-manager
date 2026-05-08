/**
 * MBKAirGapPanel.jsx
 *
 * Air-Gap-Übergabe-Center für eine Einheit. Vier Payload-Blöcke gemäß
 * docs/mbk-air-gap-uebergabe.md, jeder mit Copy- und Download-Aktion +
 * manuellem „übergeben"-Haken (localStorage). Die Payloads werden
 * on-the-fly aus den Quelldaten gebaut — keine DB-Persistenz in dieser
 * Phase (siehe Roadmap Schritt 4).
 *
 * Datenshape und Builder kommen aus lib/mbkAirGapPayloads.js.
 * Hash-Berechnung aus lib/systemContextHash.js.
 */
import React, { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Globe2,
  LayoutList,
  Package,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

import AirGapBlockCard from './AirGapBlockCard';
import AirGapItemList from './AirGapItemList';

export default function MBKAirGapPanel({ einheitId }) {
  const { land, bundesland, schulform } = useSchulStammdaten();
  const stammdaten = { land, bundesland, schulform };

  // ── Daten laden (analog zum Legacy-Panel) ─────────────────────────────
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

  // ── Live-Hash & Handover-State ─────────────────────────────────────────
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

  // ── Aufgabenbausteine (Legacy) für tsIndex — wir lassen die Air-Gap-Welt
  // bewusst auch deren Timestamps mitlaufen, weil das Lernpaket-Erstellungs-
  // paket im Index dieselbe Logik teilt. Kein Render-Effekt im UI.
  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Aufgabenbausteine.list();
      return all.filter((a) => paketIds.includes(a.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  // Source-Timestamp-Index — geteilt mit der Drift-Logik in
  // exportPromptSync.js. Air-Gap-Felder wurden in Schritt 4 ergänzt.
  const tsIndex = useMemo(
    () =>
      buildSourceTimestampIndex({
        einheit,
        themenfelder,
        lernpakete,
        lernziele,
        aufgabenbausteine,
        phaseAktivitaeten,
        masterAufgaben,
        allgemeineAufgaben,
        globalPrompts,
      }),
    [einheit, themenfelder, lernpakete, lernziele, aufgabenbausteine, phaseAktivitaeten, masterAufgaben, allgemeineAufgaben, globalPrompts]
  );

  // Persistierte Air-Gap-Records aus der DB.
  const { prompts: dbPrompts = [] } = useExportPrompts(einheitId);

  // Air-Gap-Bulk-Hook: Plan, Schreibaktion, aggregierter Block-Status.
  const {
    summary: bulkSummary,
    blockAggregate,
    running: bulkRunning,
    runBulk,
  } = useAirGapBulk({
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
    prompts: dbPrompts,
    tsIndex,
    systemContextHash: currentHash,
  });

  // Spec §5.3: Sobald die DB-Drift-Erkennung in einem Block einen Stale-
  // Record meldet, wird der lokale "Hab ich's übergeben?"-Haken automatisch
  // invalidiert. So sieht der Operator sofort: erneut rüberschieben.
  useEffect(() => {
    if (!einheitId) return;
    for (const blockKey of Object.keys(blockAggregate)) {
      if (blockAggregate[blockKey].hasAnyStale && blockStatus[blockKey]?.rawDelivered) {
        invalidateBlock(blockKey);
      }
    }
    // Wir hängen NICHT an blockStatus, sonst würde der Effekt bei jeder
    // Status-Änderung (auch durch invalidate selbst) erneut feuern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockAggregate, einheitId]);

  // ── Payload-Builder ────────────────────────────────────────────────────
  const buildSysCtx = () =>
    buildSystemContextPayload({
      stammdaten,
      schulNomenklatur,
      globalPrompts,
      systemContextHash: currentHash,
    });

  const buildStructure = () =>
    buildStructurePayload({
      einheit,
      themenfelder,
      lernpakete,
      lernziele,
      phaseAktivitaeten,
      katalogById,
      allgemeineAufgaben,
      systemContextHash: currentHash,
    });

  const allgemeineAufgabenEbene23 = useMemo(
    () =>
      allgemeineAufgaben.filter(
        (a) => a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt'
      ),
    [allgemeineAufgaben]
  );

  const taskBundle = useMemo(
    () =>
      buildTaskContentBundle({
        einheit,
        lernpakete,
        lernziele,
        phaseAktivitaeten,
        katalogById,
        masterAufgaben,
        allgemeineAufgabenEbene23,
        systemContextHash: currentHash,
      }),
    [einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById, masterAufgaben, allgemeineAufgabenEbene23, currentHash]
  );

  const microBundle = useMemo(
    () =>
      buildMicroPayloadBundle({
        einheit,
        themenfelder,
        lernpakete,
        lernziele,
        phaseAktivitaeten,
        katalogById,
        allgemeineAufgaben,
        systemContextHash: currentHash,
      }),
    [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben, currentHash]
  );

  // Sub-Item-Listen (für Block 3 + 4)
  const taskItems = useMemo(() => {
    // Lookup-Maps für effizienten Item-Build pro Klick.
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
        key: `lp-${lp.id}`,
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
      key: `aa-${aa.id}`,
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
        key: `pa-${pa.id}`,
        label: `🤖 ${katalog?.name || 'Aktivität'}`,
        subLabel: lp?.titel_des_pakets || '—',
        slug: slugify(`${katalog?.name || 'aktivitaet'}-${pa.id}`, pa.id),
        build: () =>
          buildMicroPayloadForActivity({
            einheit,
            aktivitaet: pa,
            lernpaket: lp,
            themenfeld: tf,
            phaseAktivitaetenInPaket: phasenByPaket.get(pa.lernpaket_id) || [],
            lernziele: zieleByPaket.get(pa.lernpaket_id) || [],
            katalogById,
            systemContextHash: currentHash,
          }),
      });
    }
    for (const aa of allgemeineAufgaben) {
      if (aa.erstellungs_modus !== 'ki') continue;
      const tf = aa.themenfeld_id ? themenfeldById.get(aa.themenfeld_id) || null : null;
      items.push({
        key: `aa-${aa.id}`,
        label: `🤖 ${aa.titel || 'Aufgabe'}`,
        subLabel: aa.anforderungsebene || 'Allgemeine Aufgabe',
        slug: slugify(aa.titel, aa.id),
        build: () =>
          buildMicroPayloadForAllgemeineAufgabe({
            einheit,
            aufgabe: aa,
            themenfeld: tf,
            systemContextHash: currentHash,
          }),
      });
    }
    return items;
  }, [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, allgemeineAufgaben, katalogById, currentHash]);

  // ── Aktion-Helfer (mit Toast-Feedback) ─────────────────────────────────
  const baseSlug = slugify(einheit?.titel_der_einheit, einheitId || 'einheit');

  const safeAction = async (fn, successMsg) => {
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      toast.error(err?.message || 'Aktion fehlgeschlagen.');
    }
  };

  const handleCopy = (payload) =>
    safeAction(() => copyAsMarkdownFence(payload), 'In Zwischenablage kopiert.');

  const handleDownload = (payload, name) =>
    safeAction(() => Promise.resolve(downloadJson(payload, name)), null);

  const handleDownloadZip = (files, name) =>
    safeAction(() => downloadZip(files, name), null);

  // ── Empty-State ────────────────────────────────────────────────────────
  if (!einheitId || !einheit) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Keine Einheit ausgewählt — der Air-Gap-Übergabe-Modus benötigt eine konkrete Einheit.
      </div>
    );
  }

  const block1Done = blockStatus.system_context.delivered;
  const block2Done = blockStatus.structure.delivered;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header + Fortschritt */}
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Air-Gap-Übergabe an die MBK</h2>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
              Vier strukturierte JSON-Payloads, die nacheinander an die Moodle-Builder-KI
              übergeben werden. Der Workflow läuft per Copy/Paste oder Datei-Download —
              ohne direkte Schnittstelle.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background text-sm">
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
      </div>

      {/* Block 1 — System-Kontext */}
      <AirGapBlockCard
        index={1}
        icon={<Globe2 className="w-4 h-4 text-primary" />}
        title="System-Kontext"
        description="Stammdaten, Schul-Nomenklatur und globale MBK-Prompts. Wird einmalig pro Sitzung an die MBK übergeben."
        delivered={blockStatus.system_context.delivered}
        rawDelivered={blockStatus.system_context.rawDelivered}
        isStale={blockStatus.system_context.isStale || blockAggregate.mbk_system_context.hasAnyStale}
        onToggleDelivered={(v) => setDelivered('system_context', v)}
        onCopy={() => handleCopy(buildSysCtx())}
        onDownload={() => handleDownload(buildSysCtx(), `mbk-system-context_${baseSlug}.json`)}
      />

      {/* Block 2 — Struktur */}
      <AirGapBlockCard
        index={2}
        icon={<LayoutList className="w-4 h-4 text-primary" />}
        title="Struktur der Einheit"
        description='Themenfelder, Lernpakete, Lernziele, Aktivitäts-Slots und alle vier Lernpfade — als "Inhaltsverzeichnis" für die MBK.'
        delivered={blockStatus.structure.delivered}
        rawDelivered={blockStatus.structure.rawDelivered}
        isStale={blockStatus.structure.isStale || blockAggregate.mbk_structure_payload.hasAnyStale}
        onToggleDelivered={(v) => setDelivered('structure', v)}
        dePrioritized={!block1Done}
        onCopy={() => handleCopy(buildStructure())}
        onDownload={() => handleDownload(buildStructure(), `mbk-structure_${baseSlug}.json`)}
      />

      {/* Block 3 — Aufgabeninhalte */}
      <AirGapBlockCard
        index={3}
        icon={<Package className="w-4 h-4 text-primary" />}
        title="Aufgabeninhalte"
        description="Pro Lernpaket bzw. Allgemeiner Aufgabe: ausgearbeitete Inhalte (manuelle field_values, Master-Aufgaben). KI-Aktivitaeten werden hier nur strukturell durchgereicht — ihr Briefing kommt in Block 4."
        itemCount={taskItems.length}
        delivered={blockStatus.task_content.delivered}
        rawDelivered={blockStatus.task_content.rawDelivered}
        isStale={blockStatus.task_content.isStale || blockAggregate.mbk_task_content_payload.hasAnyStale}
        onToggleDelivered={(v) => setDelivered('task_content', v)}
        dePrioritized={!block2Done}
        onCopy={() => handleCopy(taskBundle)}
        onDownload={() => handleDownload(taskBundle, `mbk-task-content_${baseSlug}.json`)}
        onDownloadBundle={
          taskItems.length === 0
            ? null
            : () =>
                handleDownloadZip(
                  [
                    { name: `_bundle.json`, content: taskBundle },
                    ...taskItems.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
                  ],
                  `mbk-task-content_${baseSlug}.zip`
                )
        }
      >
        <AirGapItemList
          items={taskItems}
          emptyHint="Keine Lernpakete oder Allgemeine Aufgaben (Ebene 2/3) vorhanden."
          onCopyItem={(it) => handleCopy(it.build())}
          onDownloadItem={(it) =>
            handleDownload(it.build(), `mbk-task-content_${baseSlug}_${it.slug}.json`)
          }
        />
      </AirGapBlockCard>

      {/* Block 4 — Micro-Briefings */}
      <AirGapBlockCard
        index={4}
        icon={<Sparkles className="w-4 h-4 text-primary" />}
        title="Micro-Briefings"
        description="Pro KI-Aktivität / KI-Aufgabe ein schlankes Briefing (GPS, Lernziele, Source-of-Truth, Blueprint). Nur Items mit erstellungs_modus='ki'."
        itemCount={microItems.length}
        delivered={blockStatus.micro.delivered}
        rawDelivered={blockStatus.micro.rawDelivered}
        isStale={blockStatus.micro.isStale || blockAggregate.mbk_micro_payload.hasAnyStale}
        onToggleDelivered={(v) => setDelivered('micro', v)}
        dePrioritized={!block2Done}
        onCopy={() => handleCopy(microBundle)}
        onDownload={() => handleDownload(microBundle, `mbk-micro_${baseSlug}.json`)}
        onDownloadBundle={
          microItems.length === 0
            ? null
            : () =>
                handleDownloadZip(
                  [
                    { name: `_bundle.json`, content: microBundle },
                    ...microItems.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
                  ],
                  `mbk-micro_${baseSlug}.zip`
                )
        }
      >
        <AirGapItemList
          items={microItems}
          emptyHint='Keine KI-Aktivitäten/KI-Aufgaben in dieser Einheit. (Items im KI-Modus erscheinen hier automatisch.)'
          onCopyItem={(it) => handleCopy(it.build())}
          onDownloadItem={(it) =>
            handleDownload(it.build(), `mbk-micro_${baseSlug}_${it.slug}.json`)
          }
        />
      </AirGapBlockCard>
    </div>
  );
}