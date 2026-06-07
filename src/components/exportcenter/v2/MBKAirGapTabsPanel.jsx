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
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import ExportTodoRow from './shared/ExportTodoRow';

import { useExportPrompts } from '@/hooks/useExportPrompts';
import { useAirGapBulk } from '@/hooks/useAirGapBulk';
import { buildSourceTimestampIndex } from '@/lib/exportPromptSync';
import {
  buildUiConfigPayload,
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentBundle,
  buildTaskContentItemForLernpaket,
  buildTaskContentItemForAllgemeineAufgabe,
  buildMicroPayloadBundle,
  buildMicroPayloadForActivity,
  buildMicroPayloadForAllgemeineAufgabe,
  buildSystembausteinPayloadBundle,
  buildSystembausteinPayloadItem,
  extractNavigationContextByRefId,
  isMicroBriefingActivity,
  makeSystembausteinReferenceId,
} from '@/lib/mbkAirGapPayloads';
import { computeSystemContextHash, computeUiConfigHash } from '@/lib/systemContextHash';
import {
  copyAsMarkdownFence,
  downloadJson,
  downloadZip,
  slugify,
} from '@/lib/airGapClipboard';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';
import { useAirGapHandoverState } from '@/hooks/useAirGapHandoverState';
import { groupTaskItems, groupMicroItems, groupSystembausteinItems } from '@/lib/airGapBundleGroups';
import { buildLernpaketSubLabel, buildAllgemeineAufgabeSubLabel } from '@/lib/airGapTaskItemSubLabel';

import InfoTab from './tabs/InfoTab';
import MetaPromptTab from './tabs/MetaPromptTab';
import UiConfigTab from './tabs/UiConfigTab';
import StrukturTab from './tabs/StrukturTab';
import AufgabenTab from './tabs/AufgabenTab';
import GlobaleKiTab from './tabs/GlobaleKiTab';
import SystembausteineTab from './tabs/SystembausteineTab';
import KiAufgabenTab from './tabs/KiAufgabenTab';
import TabDriftIndicator from './shared/TabDriftIndicator';

export default function MBKAirGapTabsPanel({ einheitId }) {
  const [activeTab, setActiveTab] = useState('info');

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

  // System-Bausteine: deduplizierte Quellen für die `system-<baustein_id>.html`-
  // Dateien im SCORM-Mapping. Werden vom Lernpfad-Architekten referenziert
  // (`{ type: 'system', ref_id: '<baustein_id>' }`) und dürfen NICHT pro
  // Einheit erneut gepflegt werden — daher app-weiter Cache.
  const { data: systemBausteine = [] } = useQuery({
    queryKey: ['systemBausteine'],
    queryFn: () => base44.entities.SystemBausteine.list('-created_date', 200),
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

  // ── Hashes & Handover-State (airgap-1.5.0: zwei separate Hashes) ────
  const currentHash = useMemo(
    () => computeSystemContextHash({ stammdaten, schulNomenklatur, globalPrompts }),
    [stammdaten, schulNomenklatur, globalPrompts]
  );
  const currentUiHash = useMemo(
    () => computeUiConfigHash({ globalPrompts }),
    [globalPrompts]
  );

  // Der Handover-State invalidiert „übergeben"-Haken bei Hash-Drift.
  // Wir kombinieren beide Hashes zu einem Composite, damit ein Edit
  // an EINEM von beiden alle „übergeben"-Haken sauber zurücksetzt.
  const compositeHash = useMemo(
    () => `${currentHash}::${currentUiHash}`,
    [currentHash, currentUiHash]
  );

  const {
    blockStatus,
    deliveredCount,
    totalBlocks,
    setDelivered,
    invalidateBlock,
    reset,
  } = useAirGapHandoverState({ einheitId, currentHash: compositeHash });

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
    systemBausteine,
    prompts: dbPrompts, tsIndex,
    systemContextHash: currentHash,
    uiConfigHash: currentUiHash,
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
  const buildUi = () =>
    buildUiConfigPayload({ globalPrompts, uiConfigHash: currentUiHash });
  const buildSysCtx = () =>
    buildSystemContextPayload({ stammdaten, schulNomenklatur, globalPrompts, systemContextHash: currentHash });

  // airgap-1.4.0: Strukturpayload einmal memoisieren — die navigation_context-
  // Map daraus brauchen wir auch beim Bauen von Payload 3/4, damit jeder
  // Item-Eintrag seine `back_targets` (injection_points) bekommt.
  const structurePayload = useMemo(
    () =>
      buildStructurePayload({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
        katalogById, allgemeineAufgaben, systemBausteine,
        systemContextHash: currentHash,
        uiConfigHash: currentUiHash,
      }),
    [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, allgemeineAufgaben, systemBausteine, currentHash, currentUiHash]
  );
  const buildStructure = () => structurePayload;

  const navigationContextByRefId = useMemo(
    () => extractNavigationContextByRefId(structurePayload?.scorm_file_mapping || []),
    [structurePayload]
  );

  const taskBundle = useMemo(
    () =>
      buildTaskContentBundle({
        einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById,
        masterAufgaben, allgemeineAufgabenEbene23,
        navigationContextByRefId,
        systemContextHash: currentHash,
        uiConfigHash: currentUiHash,
      }),
    [einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById, masterAufgaben, allgemeineAufgabenEbene23, navigationContextByRefId, currentHash, currentUiHash]
  );

  const microBundle = useMemo(
    () =>
      buildMicroPayloadBundle({
        einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
        katalogById, masterAufgaben, allgemeineAufgaben,
        navigationContextByRefId,
        systemContextHash: currentHash,
        uiConfigHash: currentUiHash,
      }),
    [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, katalogById, masterAufgaben, allgemeineAufgaben, navigationContextByRefId, currentHash, currentUiHash]
  );

  // airgap-1.6.0: Systembaustein-Bundle (Payload 5).
  const systembausteinBundle = useMemo(
    () =>
      buildSystembausteinPayloadBundle({
        einheit, themenfelder, lernpakete, lernziele, systemBausteine,
        navigationContextByRefId,
        systemContextHash: currentHash,
        uiConfigHash: currentUiHash,
      }),
    [einheit, themenfelder, lernpakete, lernziele, systemBausteine, navigationContextByRefId, currentHash, currentUiHash]
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

    const navFor = (refId) => navigationContextByRefId.get(refId) || [];

    const lpItems = [...lernpakete]
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
      .map((lp) => {
        const phasen = phasenByPaket.get(lp.id) || [];
        const sub = buildLernpaketSubLabel({
          phaseAktivitaetenInPaket: phasen,
          katalogById,
        });
        return {
          key: `mbk-task-lp::${lp.id}`,
          label: `📦 ${lp.titel_des_pakets || '(ohne Titel)'}`,
          subLabel: sub.text,
          kiHint: sub.kiHint,
          kiSeverity: sub.kiSeverity,
          build: () =>
            buildTaskContentItemForLernpaket({
              lernpaket: lp,
              lernziele: zieleByPaket.get(lp.id) || [],
              phaseAktivitaeten: phasen,
              katalogById,
              masterAufgaben: masterByPaket.get(lp.id) || [],
              navigationContext: navFor(lp.id),
            }),
          slug: slugify(lp.titel_des_pakets, lp.id),
        };
      });

    const aaItems = allgemeineAufgabenEbene23.map((aa) => {
      const sub = buildAllgemeineAufgabeSubLabel(aa);
      return {
        key: `mbk-task-aa::${aa.id}`,
        label: `🎯 ${aa.titel || '(ohne Titel)'}`,
        subLabel: sub.text,
        kiHint: sub.kiHint,
        kiSeverity: sub.kiSeverity,
        build: () =>
          buildTaskContentItemForAllgemeineAufgabe({
            aufgabe: aa,
            navigationContext: navFor(aa.id),
          }),
        slug: slugify(aa.titel, aa.id),
      };
    });

    return [...lpItems, ...aaItems];
  }, [lernpakete, lernziele, phaseAktivitaeten, masterAufgaben, allgemeineAufgabenEbene23, katalogById, navigationContextByRefId]);

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

    const navFor = (refId) => navigationContextByRefId.get(refId) || [];

    // MasterAufgaben pro Aktivität — für offene Aufgaben, die ihren
    // Aufgaben-Inhalt typischerweise erst in den Mastern pflegen.
    const masterByActivity = new Map();
    for (const m of masterAufgaben) {
      if (!m?.activity_id) continue;
      if (!masterByActivity.has(m.activity_id)) masterByActivity.set(m.activity_id, []);
      masterByActivity.get(m.activity_id).push(m);
    }

    const items = [];
    for (const pa of phaseAktivitaeten) {
      if (!isMicroBriefingActivity(pa, katalogById)) continue;
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
            katalogById,
            masterAufgabenForActivity: masterByActivity.get(pa.id) || [],
            // Fragment erbt nav-Context von der Hülle (= Lernpaket).
            navigationContext: lp ? navFor(lp.id) : [],
            systemContextHash: currentHash,
            uiConfigHash: currentUiHash,
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
            einheit, aufgabe: aa, themenfeld: tf,
            navigationContext: navFor(aa.id),
            systemContextHash: currentHash,
            uiConfigHash: currentUiHash,
          }),
      });
    }
    return items;
  }, [einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten, masterAufgaben, allgemeineAufgaben, katalogById, currentHash, currentUiHash, navigationContextByRefId]);

  // airgap-1.6.0: Systembaustein-Items (Payload 5) — pro Lerntyp × baustein_id
  // genau ein Item, sofern der Baustein im jeweiligen Lernpfad referenziert ist.
  const systembausteinItems = useMemo(() => {
    if (!einheit) return [];
    const themenfelderById = new Map(themenfelder.map((tf) => [tf.id, tf]));
    const bausteinByKey = new Map(systemBausteine.map((b) => [b.baustein_id, b]));
    const navFor = (refId) => navigationContextByRefId.get(refId) || [];
    const out = [];
    for (const lt of ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']) {
      const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
      const seen = new Set();
      for (const sektor of sektoren) {
        for (const item of sektor?.items || []) {
          if (item?.type !== 'system' || !item?.ref_id) continue;
          // Platzhalter (`sys_platzhalter_*`) sind reine Architekt-Drop-Zonen
          // (z. B. „Platzhalter: handlungsorientierte Aufgabe", „Platzhalter:
          // Brian-Bündel"). Sie werden nicht exportiert und dürfen daher auch
          // nicht in der Liste der Systembaustein-Items im Export-Center
          // auftauchen — konsistent mit dem Filter in lib/mbkAirGapPayloads.js.
          if (typeof item.ref_id === 'string' && item.ref_id.startsWith('sys_platzhalter_')) continue;
          if (seen.has(item.ref_id)) continue;
          seen.add(item.ref_id);
          const bausteinId = item.ref_id;
          const refId = makeSystembausteinReferenceId(lt, bausteinId);
          const baustein = bausteinByKey.get(bausteinId);
          out.push({
            key: `mbk-sysbaustein::${refId}`,
            label: `🧩 ${baustein?.titel || bausteinId}`,
            subLabel: lt,
            slug: slugify(`${lt}-${bausteinId}`, refId),
            lerntyp: lt,
            bausteinId,
            build: () =>
              buildSystembausteinPayloadItem({
                einheit,
                lerntyp: lt,
                bausteinId,
                systemBaustein: baustein || null,
                lerntypPfad: sektoren,
                themenfelderById,
                lernpakete,
                lernziele,
                navigationContext: navFor(refId),
                systemContextHash: currentHash,
                uiConfigHash: currentUiHash,
              }),
          });
        }
      }
    }
    return out;
  }, [einheit, themenfelder, lernpakete, lernziele, systemBausteine, navigationContextByRefId, currentHash, currentUiHash]);

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
  const systembausteinGroups = useMemo(
    () => groupSystembausteinItems(systembausteinItems),
    [systembausteinItems]
  );

  const handleDownloadGroupZip = (group, blockSlug) =>
    handleDownloadZip(
      group.items.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
      `mbk-${blockSlug}_${baseSlug}_${group.key.replace('::', '-')}.zip`
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
      'mbk_ui_config': { newCount: 0, staleCount: 0 },
      'mbk_structure_payload': { newCount: 0, staleCount: 0 },
      'mbk_task_content_payload': { newCount: 0, staleCount: 0 },
      'mbk_system_context': { newCount: 0, staleCount: 0 },
      'mbk_micro_payload': { newCount: 0, staleCount: 0 },
      'mbk_systembaustein_payload': { newCount: 0, staleCount: 0 },
    };
    for (const it of bulkPlan || []) {
      const c = counts[it.section];
      if (!c) continue;
      if (it.status === 'new') c.newCount += 1;
      else if (it.status === 'update') c.staleCount += 1;
    }
    return counts;
  }, [bulkPlan]);

  // Initial-Export-Flag: Die Einheit wurde noch nie nach Moodle exportiert.
  // Vor dem ersten Export ist „Out of Sync" semantisch sinnlos — Hash-
  // Drifts werden in der UI deshalb als „Neu" entschärft. Sobald der
  // Spezialist im Export-Center „Export beendet & Freigeben" geklickt
  // hat (`export_published_at` gesetzt), greift wieder die strenge
  // Drift-Erkennung.
  const isInitialExport = useMemo(() => {
    if (!einheit) return false;
    return !einheit.last_synced_at && !einheit.export_published_at;
  }, [einheit]);

  const uiPlanItem = useMemo(
    () => (bulkPlan || []).find((it) => it.section === 'mbk_ui_config') || null,
    [bulkPlan]
  );
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
  // Vertikale To-Do-Liste: Info/Meta zuerst (Einrichtung), dann die
  // sechs Übergabe-Payloads in der empfohlenen Reihenfolge. Jeder Schritt
  // ist eine aufklappbare Zeile mit Status-Zähler + Erledigt-Häkchen.
  const driftBadge = (counts) => (
    <TabDriftIndicator {...counts} treatStaleAsNew={isInitialExport} />
  );

  return (
    <div className="space-y-4">
      <AccordionPrimitive.Root
        type="single"
        collapsible
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-2"
      >
        {/* Einrichtung */}
        <ExportTodoRow value="info" stepNumber="i" title="Info & Status"
          description="Überblick über Einheit, Lebenszyklus und Delta-Analyse.">
          <InfoTab einheit={einheit} />
        </ExportTodoRow>

        <ExportTodoRow value="meta" stepNumber="M" title="Meta-System-Prompt"
          description="Einmalige Grundanweisung an die KI für diese Übergabe.">
          <MetaPromptTab />
        </ExportTodoRow>

        {/* Übergabe-Payloads */}
        <ExportTodoRow value="ui-config" stepNumber="1" title="🎨 UI"
          description="Darstellung: CSS, Tab-Leiste, Kopfzeilen-Vorlage."
          done={blockStatus.ui_config.delivered}
          badge={driftBadge(tabCounts.mbk_ui_config)}>
          <UiConfigTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            planItem={uiPlanItem}
            payload={buildUi()}
            isInitialExport={isInitialExport}
            onToggleDelivered={(v) => setDelivered('ui_config', v)}
            onCopy={() => handleCopy(buildUi())}
            onDownload={() => handleDownload(buildUi(), `mbk-ui-config_${baseSlug}.json`)}
          />
        </ExportTodoRow>

        <ExportTodoRow value="struktur" stepNumber="2" title="Struktur"
          description="Inhaltsverzeichnis: Themenfelder, Lernpakete, Lernpfade."
          done={blockStatus.structure.delivered}
          badge={driftBadge(tabCounts.mbk_structure_payload)}>
          <StrukturTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            planItem={structurePlanItem}
            payload={buildStructure()}
            isInitialExport={isInitialExport}
            onToggleDelivered={(v) => setDelivered('structure', v)}
            onCopy={() => handleCopy(buildStructure())}
            onDownload={() => handleDownload(buildStructure(), `mbk-structure_${baseSlug}.json`)}
          />
        </ExportTodoRow>

        <ExportTodoRow value="aufgaben" stepNumber="3" title="Aufgaben"
          description="Ausgearbeitete Aufgabeninhalte pro Lernpaket / Aufgabe."
          done={blockStatus.task_content.delivered}
          badge={driftBadge(tabCounts.mbk_task_content_payload)}>
          <AufgabenTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            taskItems={taskItems}
            taskGroups={taskGroups}
            taskBundle={taskBundle}
            itemPlanLookup={itemPlanLookup}
            isInitialExport={isInitialExport}
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
        </ExportTodoRow>

        <ExportTodoRow value="globale-ki" stepNumber="4" title="Globale KI"
          description="Schulweiter System-Kontext (Nomenklatur, Stammdaten)."
          done={blockStatus.system_context.delivered}
          badge={driftBadge(tabCounts.mbk_system_context)}>
          <GlobaleKiTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            planItem={systemPlanItem}
            payload={buildSysCtx()}
            isInitialExport={isInitialExport}
            onToggleDelivered={(v) => setDelivered('system_context', v)}
            onCopy={() => handleCopy(buildSysCtx())}
            onDownload={() => handleDownload(buildSysCtx(), `mbk-system-context_${baseSlug}.json`)}
          />
        </ExportTodoRow>

        <ExportTodoRow value="systembausteine" stepNumber="5" title="Systembausteine"
          description="Standard-Bausteine pro Lerntyp (Einführung, Diagnose …)."
          done={blockStatus.systembausteine.delivered}
          badge={driftBadge(tabCounts.mbk_systembaustein_payload)}>
          <SystembausteineTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            systembausteinItems={systembausteinItems}
            systembausteinGroups={systembausteinGroups}
            itemPlanLookup={itemPlanLookup}
            isInitialExport={isInitialExport}
            onToggleDelivered={(v) => setDelivered('systembausteine', v)}
            onCopy={() => handleCopy(systembausteinBundle)}
            onDownload={() => handleDownload(systembausteinBundle, `mbk-systembausteine_${baseSlug}.json`)}
            onDownloadBundle={() =>
              handleDownloadZip(
                [
                  { name: `_bundle.json`, content: systembausteinBundle },
                  ...systembausteinItems.map((it) => ({ name: `${it.slug}.json`, content: it.build() })),
                ],
                `mbk-systembausteine_${baseSlug}.zip`
              )
            }
            onCopyItem={(it) => handleCopy(it.build())}
            onDownloadItem={(it) =>
              handleDownload(it.build(), `mbk-systembausteine_${baseSlug}_${it.slug}.json`)
            }
            onDownloadGroupZip={(g) => handleDownloadGroupZip(g, 'systembausteine')}
          />
        </ExportTodoRow>

        <ExportTodoRow value="ki-aufgaben" stepNumber="6" title="KI-Aufgaben"
          description="Briefings für KI-generierte Aufgaben (Payload 4)."
          done={blockStatus.micro.delivered}
          badge={driftBadge(tabCounts.mbk_micro_payload)}>
          <KiAufgabenTab
            blockStatus={blockStatus}
            blockAggregate={blockAggregate}
            microItems={microItems}
            microGroups={microGroups}
            itemPlanLookup={itemPlanLookup}
            isInitialExport={isInitialExport}
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
        </ExportTodoRow>
      </AccordionPrimitive.Root>
    </div>
  );
}