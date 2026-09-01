/**
 * LernpfadeCockpit.jsx
 *
 * Schlanker Orchestrator für Tab 7 „Dashboards" (Lernpfad-Architekt).
 * Hält den Konfigurations-State und delegiert:
 *   - Persistenz          → useDashboardSync
 *   - Drag & Drop         → useDashboardDragAndDrop
 *   - Freigabe/Lock       → useDashboardRelease
 *   - Bündel & Elemente   → useDashboardBundleHandlers
 *   - Drift-Auflösungen   → useDashboardDriftHandlers
 *   - Vorschau-Fenster    → useCockpitPreviews + CockpitPreviewModals
 *   - Toolbar-UI          → DashboardToolbar
 *
 * Persistenz-Modell:
 *   - Beim Mount: Snapshot aus einheit.lernpfade_konfiguration laden.
 *   - Bei Änderung: lokal State aktualisieren, Backend-Save mit 800ms Debounce.
 *   - Bei Unmount/Lock-Verlust: pending Save sofort flushen.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react';
import { useEinheitFreigabeStatus } from '@/hooks/useEinheitFreigabeStatus';
import DashboardToolbar from '@/components/lernpfade/DashboardToolbar';
// Loader2 wird im Save-Indicator (saving-State) als animiertes Spinner-Icon
// genutzt – siehe `saveIndicator` weiter unten. Nicht entfernen.
import LernpfadeAufgabenPool from '@/components/lernpfade/LernpfadeAufgabenPool';
import LernpfadeArchitekt, { LERN_TYPEN } from '@/components/lernpfade/LernpfadeArchitekt';
import ReleaseBlockerModal from '@/components/lernpfade/ReleaseBlockerModal';
import ReleaseConfirmDialog from '@/components/lernpfade/ReleaseConfirmDialog';
import DidaktischerGuidePanel from '@/components/lernpfade/DidaktischerGuidePanel';
import CockpitPreviewModals from '@/components/lernpfade/CockpitPreviewModals';
import OnboardingTab from '@/components/lernpfade/OnboardingTab';
import { useLernpfadStatus } from '@/hooks/useLernpfadStatus';
import { useDashboardSync } from '@/hooks/useDashboardSync';
import { useDashboardDragAndDrop } from '@/hooks/useDashboardDragAndDrop';
import { useDashboardRelease } from '@/hooks/useDashboardRelease';
import { useDashboardDrift } from '@/hooks/useDashboardDrift';
import { useLernpfadDriftReport } from '@/hooks/useLernpfadDriftReport';
import { PFAD_STATUS } from '@/lib/pfadStatus';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import {
  getUsedAufgabenIds,
  createNewSektor,
  addSektor,
  patchSektor,
  removeSektor,
  moveSektor,
  removeAufgabeFromLernTyp,
} from '@/lib/lernpfadeUtils';
import { useDashboardBundleHandlers } from '@/hooks/useDashboardBundleHandlers';
import { useDashboardDriftHandlers } from '@/hooks/useDashboardDriftHandlers';
import { useCockpitPreviews } from '@/hooks/useCockpitPreviews';
import CascadeDeleteDialog from '@/components/lernpfade/CascadeDeleteDialog';
import ArbeitsphaseModal from '@/components/lernpfade/ArbeitsphaseModal.jsx';
import { getArbeitsphaseDefaultItems, UEBUNGSBLOCK_TEMPLATE } from '@/lib/dashboardTemplates';
import { istUebungsblock } from '@/lib/einheitFormat';
import { buildEffectiveTemplates, getEffectiveTemplateForLerntyp } from '@/lib/dashboardStandardVorlage';
import { getSektorTemplate, SEKTOR_TEMPLATE_KEYS } from '@/lib/sektorTemplates';
import { SEKTOR_TYP } from '@/lib/sektorTypen';
import { getThemenfelderByEinheit, createThemenfeld } from '@/services/ThemenfeldService';
import { useToast } from '@/components/ui/use-toast';
import ResetDashboardConfirmDialog from '@/components/lernpfade/ResetDashboardConfirmDialog';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { getAmpelStatus } from '@/lib/ampelLogic';
import { adaptLernpaketToPoolItem } from '@/lib/lernpaketAdapter';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';
import { ladeOnboardingSnapshots } from '@/lib/onboardingSnapshots';
import { autoAssembleLerntyp, AUTO_DASHBOARD_STATUS } from '@/lib/dashboardAutoAssembly';
import { useDashboardAutoStatus } from '@/hooks/useDashboardAutoStatus';
import { getAktiveLerntypKeys } from '@/lib/lerntypen';
import { useLerntypDefinitionen } from '@/hooks/useLerntypDefinitionen';

const DEFAULT_KONFIG = { minimalist: [], pragmatiker: [], ehrgeizig: [], passioniert: [] };

export default function LernpfadeCockpit({
  einheit,
  isStructuralEditingActive,
  isLockedByOther,
  kannBearbeiten,
  onEndEditing,
  isEndingEdit = false,
  flushRef,
}) {
  // Hinweis: Lock-Acquire/Release wird vom Parent (`Workspace`) gehandhabt
  // und betrifft das Cockpit nur indirekt über `isStructuralEditingActive` /
  // `isLockedByOther`. Die früher hier durchgereichten Props
  // (acquiringStructLock, releasingStructLock, onAcquireLock, onReleaseLock)
  // wurden im Body nie konsumiert und sind daher entfernt worden.
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Alle Vorschau-Fenster (Dashboard, Onboarding-Elemente, Themenfeld-
  // Einführung, Aufgabe) inkl. Snapshot-Persistenz.
  const previews = useCockpitPreviews({ einheitId: einheit?.id, toast, queryClient });

  // ── State ───────────────────────────────────────────────────────────
  const [konfiguration, setKonfiguration] = useState(
    () => einheit?.lernpfade_konfiguration || DEFAULT_KONFIG
  );
  // Deep-Link-Support: Wenn die URL `?lerntyp=...` mitbringt (z. B. von der
  // Einheiten-Übersicht via DashboardProgressBar), öffnen wir direkt diesen
  // Lerntyp-Tab. Param wird danach aus der URL entfernt, damit eigene Klicks
  // im Cockpit nicht überschrieben werden.
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
  const initialLernTyp = (() => {
    const p = searchParams.get('lerntyp');
    return VALID_LERNTYPEN.includes(p) ? p : 'pragmatiker';
  })();
  const [activeLernTyp, setActiveLernTyp] = useState(initialLernTyp);

  // Akkordeon (Sektoren + Bündel): standardmäßig ist ALLES zugeklappt —
  // die Lehrkraft sieht zunächst nur die Sektor-Köpfe und klappt gezielt auf.
  // Die Sets enthalten die IDs der AUFgeklappten Sektoren/Bündel.
  const [expandedSektoren, setExpandedSektoren] = useState(() => new Set());
  const [expandedBundles, setExpandedBundles] = useState(() => new Set());

  // Phase F.2: Deep-Link-Sektor. Tab 7 wird im Workspace nicht unmountet,
  // wenn der User von Tab 8 herübernavigiert — daher reagieren wir REAKTIV
  // auf Änderungen der `?lerntyp`- und `?sektor`-Params (nicht nur beim
  // ersten Mount). Sobald wir die Werte gelesen haben, leeren wir sie aus
  // der URL, damit eigene Klicks im Cockpit nicht überschrieben werden.
  const pendingScrollSektorRef = useRef(null);
  useEffect(() => {
    const lerntypParam = searchParams.get('lerntyp');
    const sektorParam = searchParams.get('sektor');
    if (!lerntypParam && !sektorParam) return;
    if (lerntypParam && VALID_LERNTYPEN.includes(lerntypParam)) {
      setActiveLernTyp(lerntypParam);
      setSelectedAufgabeIdState(null);
      setSelectedSystemBausteinIdState(null);
    }
    if (sektorParam) {
      pendingScrollSektorRef.current = sektorParam;
      // Deep-Link-Ziel direkt aufklappen, damit der Scroll etwas zeigt.
      setExpandedSektoren((prev) => {
        const next = new Set(prev);
        next.add(sektorParam);
        return next;
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('lerntyp');
    next.delete('sektor');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [editorAufgabe, setEditorAufgabe] = useState(null);
  const [arbeitsphaseModalOpen, setArbeitsphaseModalOpen] = useState(false);
  const [arbeitsphaseModalBusy, setArbeitsphaseModalBusy] = useState(false);

  // Monitor-Selection: zentral – Pool und Architekt setzen wechselseitig.
  const [selectedAufgabeId, setSelectedAufgabeIdState] = useState(null);
  const [selectedSystemBausteinId, setSelectedSystemBausteinIdState] = useState(null);

  const setSelectedAufgabeId = useCallback((id) => {
    setSelectedAufgabeIdState(id);
    if (id) setSelectedSystemBausteinIdState(null);
  }, []);
  const setSelectedSystemBausteinId = useCallback((id) => {
    setSelectedSystemBausteinIdState(id);
    if (id) setSelectedAufgabeIdState(null);
  }, []);

  const handleActiveLernTypChange = useCallback((typKey) => {
    setActiveLernTyp(typKey);
    setSelectedAufgabeIdState(null);
    setSelectedSystemBausteinIdState(null);
  }, []);

  const handleOpenAufgabeEditor = useCallback((aufgabe) => {
    if (aufgabe) setEditorAufgabe(aufgabe);
  }, []);

  // ── Privat-Modus: Lerntypen einzeln an-/abschaltbar (Stufe 1) ─────────
  // Nur bei privaten Einheiten sichtbar. Die Lehrkraft wählt, welche der
  // global definierten Lerntypen diese Einheit anbietet (mindestens einer).
  // Öffentliche Einheiten bieten immer alle an.
  const istPrivat = einheit?.sichtbarkeit === 'privat';
  const { labelByKey: lerntypNamen } = useLerntypDefinitionen();
  const [aktiveLerntypen, setAktiveLerntypen] = useState(() => getAktiveLerntypKeys(einheit));
  useEffect(() => {
    setAktiveLerntypen(getAktiveLerntypKeys(einheit));
  }, [einheit?.id, einheit?.aktive_lerntypen, einheit?.lerntypen_modus, einheit?.sichtbarkeit]);
  const [modusBusy, setModusBusy] = useState(false);

  const handleToggleLerntyp = useCallback(
    async (lerntypKey) => {
      if (!einheit?.id || modusBusy) return;
      const istAn = aktiveLerntypen.includes(lerntypKey);
      if (istAn && aktiveLerntypen.length === 1) {
        toast({
          title: 'Mindestens eine Intensitätsstufe nötig',
          description: 'Eine Einheit braucht mindestens einen aktiven Arbeitsplan.',
        });
        return;
      }
      const next = istAn
        ? aktiveLerntypen.filter((lt) => lt !== lerntypKey)
        : VALID_LERNTYPEN.filter((lt) => aktiveLerntypen.includes(lt) || lt === lerntypKey);
      setModusBusy(true);
      try {
        await base44.entities.Einheiten.update(einheit.id, { aktive_lerntypen: next });
        setAktiveLerntypen(next);
        if (!next.includes(activeLernTyp) && activeLernTyp !== 'onboarding') {
          setActiveLernTyp(next[0]);
          setSelectedAufgabeIdState(null);
          setSelectedSystemBausteinIdState(null);
        }
        queryClient.invalidateQueries({ queryKey: ['workspace-data', einheit.id] });
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Umschalten fehlgeschlagen',
          description: err?.message || 'Bitte erneut versuchen.',
        });
      } finally {
        setModusBusy(false);
      }
    },
    [einheit?.id, aktiveLerntypen, modusBusy, activeLernTyp, queryClient, toast]
  );

  // Der aktive Reiter muss immer ein angebotener Lerntyp sein (fängt auch
  // Deep-Links ab). Bei genau EINEM angebotenen Lerntyp entfällt zusätzlich
  // das Onboarding (es gibt keine Lerntyp-Wahl mehr).
  useEffect(() => {
    if (!istPrivat) return;
    if (activeLernTyp === 'onboarding' && aktiveLerntypen.length > 1) return;
    if (!aktiveLerntypen.includes(activeLernTyp)) {
      setActiveLernTyp(aktiveLerntypen[0]);
      setSelectedAufgabeIdState(null);
      setSelectedSystemBausteinIdState(null);
    }
  }, [istPrivat, aktiveLerntypen, activeLernTyp]);

  // Lernpaket-Items dürfen NICHT den Aufgaben-Editor öffnen (das ist ein
  // Lernpaket, keine Aufgabe). Stattdessen navigieren wir zu Tab 4
  // („Aktivitäten zuordnen"), wo die Lehrkraft das Lernpaket öffnen,
  // vervollständigen und freigeben kann.
  const handleOpenLernpaket = useCallback((item) => {
    const next = new URLSearchParams(searchParams);
    if (einheit?.id) next.set('einheit', einheit.id);
    next.set('tab', 'aktivitaeten');
    // Adaptierte Lernpaket-Items tragen die Lernpaket-ID in `id`.
    if (item?.id) next.set('lernpaket', item.id);
    setSearchParams(next);
  }, [searchParams, setSearchParams, einheit?.id]);

  // ── Daten-Queries ───────────────────────────────────────────────────
  const { data: aufgaben = [], isLoading: aufgabenLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheit?.id],
    queryFn: () => (einheit?.id ? getAufgabenByEinheit(einheit.id) : Promise.resolve([])),
    enabled: !!einheit?.id,
  });

  const { data: systemBausteine = [], isLoading: bausteineLoading } = useQuery({
    queryKey: ['systemBausteine', 'all'],
    queryFn: () => base44.entities.SystemBausteine.list('reihenfolge'),
  });

  // Onboarding-Inhalte aus der Single Source of Truth (SchuelerInhaltSnapshot,
  // geltungsbereich='einheit'). Ersetzt das frühere Lesen aus
  // einheit.onboarding_konfiguration.
  const { data: onboardingSnapshots = {} } = useQuery({
    queryKey: ['onboardingSnapshots', einheit?.id],
    queryFn: () => ladeOnboardingSnapshots(einheit?.id),
    enabled: !!einheit?.id,
  });

  // Admin-editierbare Standard-Dashboard-Vorlagen (DB > Hardcode-Fallback).
  // Genutzt für Lazy-Init UND „Auf Standard zurücksetzen".
  const { data: dashboardVorlagen = [] } = useQuery({
    queryKey: ['dashboardStandardVorlagen'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getDashboardStandardVorlagen', {});
      return res?.data?.vorlagen || [];
    },
  });
  const istBlock = istUebungsblock(einheit);
  const effectiveTemplates = useMemo(() => {
    const echte = buildEffectiveTemplates(dashboardVorlagen);
    if (!istBlock) return echte;
    // Übungsblock: EIN leerer Arbeitsphase-Sektor für jeden Lerntyp statt der
    // vollen Lerntyp-Vorlage. Die rahmt eine ganze Einheit (Überblick,
    // Diagnose, Abschluss) — hier müsste die Lehrkraft erst wegräumen,
    // bevor sie anfangen kann. Siehe UEBUNGSBLOCK in lib/dashboardTemplates.
    return Object.fromEntries(
      Object.keys(echte).map((lerntyp) => [lerntyp, UEBUNGSBLOCK_TEMPLATE]),
    );
  }, [dashboardVorlagen, istBlock]);
  const systemBausteineById = useMemo(() => {
    const map = new Map();
    (systemBausteine || []).forEach((b) => map.set(b.baustein_id, b));
    return map;
  }, [systemBausteine]);

  // ── Akkordeon-Steuerung ─────────────────────────────────────────────
  const toggleSektorExpanded = useCallback((sektorId) => {
    setExpandedSektoren((prev) => {
      const next = new Set(prev);
      if (next.has(sektorId)) next.delete(sektorId);
      else next.add(sektorId);
      return next;
    });
  }, []);
  const toggleBundleExpanded = useCallback((instanceId) => {
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }, []);
  // Alle Sektor-IDs + Bündel-instance_ids des aktiven Lerntyps (für
  // „Alles aufklappen / Alles zuklappen" in der Toolbar).
  const { allSektorIds, allBundleIds } = useMemo(() => {
    const sIds = [];
    const bIds = [];
    for (const s of konfiguration?.[activeLernTyp] || []) {
      if (s?.sektor_id) sIds.push(s.sektor_id);
      for (const it of s?.items || []) {
        if (
          it?.type === 'system' &&
          it?.instance_id &&
          systemBausteineById?.get(it.ref_id)?.baustein_modus === 'bundle_1ton'
        ) {
          bIds.push(it.instance_id);
        }
      }
    }
    return { allSektorIds: sIds, allBundleIds: bIds };
  }, [konfiguration, activeLernTyp, systemBausteineById]);
  const allExpanded =
    allSektorIds.length > 0 &&
    allSektorIds.every((id) => expandedSektoren.has(id)) &&
    allBundleIds.every((id) => expandedBundles.has(id));
  const handleToggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedSektoren((prev) => {
        const next = new Set(prev);
        allSektorIds.forEach((id) => next.delete(id));
        return next;
      });
      setExpandedBundles((prev) => {
        const next = new Set(prev);
        allBundleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setExpandedSektoren((prev) => new Set([...prev, ...allSektorIds]));
      setExpandedBundles((prev) => new Set([...prev, ...allBundleIds]));
    }
  }, [allExpanded, allSektorIds, allBundleIds]);

  const { data: lernpakete = [], isLoading: lernpaketeLoading } = useQuery({
    queryKey: ['lernpakete-by-einheit', einheit?.id],
    queryFn: () =>
      einheit?.id
        ? base44.entities.Lernpakete.filter({ einheit_id: einheit.id })
        : Promise.resolve([]),
    enabled: !!einheit?.id,
  });

  // Phase B: Themenfelder für Arbeitsphase-Modal und Live-Titel-Binding.
  const { data: themenfelder = [], isLoading: themenfelderLoading } = useQuery({
    queryKey: ['themenfelder-by-einheit', einheit?.id],
    queryFn: () => (einheit?.id ? getThemenfelderByEinheit(einheit.id) : Promise.resolve([])),
    enabled: !!einheit?.id,
  });
  const themenfeldTitelById = useMemo(() => {
    const map = new Map();
    (themenfelder || []).forEach((tf) => map.set(tf.id, tf.titel));
    return map;
  }, [themenfelder]);
  const lernpaketeById = useMemo(() => {
    const map = new Map();
    (lernpakete || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [lernpakete]);

  // aufgabenById enthält BEIDE Quellen (AllgemeineAufgabe + Lernpakete-Collection
  // adaptiert auf Aufgaben-Shape), damit Sektor-Pills, MonitorPanel und Ampel-
  // Logik Lernpakete genauso behandeln wie reguläre buendel-Aufgaben.
  // WICHTIG: Muss NACH der lernpakete-Query stehen (TDZ).
  const aufgabenById = useMemo(() => {
    const map = new Map();
    (aufgaben || []).forEach((a) => map.set(a.id, a));
    (lernpakete || []).forEach((lp) => {
      const adapted = adaptLernpaketToPoolItem(lp);
      if (adapted) map.set(adapted.id, adapted);
    });
    return map;
  }, [aufgaben, lernpakete]);

  const ampelCtx = useMemo(
    () => ({ aufgabenById, lernpaketeById }),
    [aufgabenById, lernpaketeById]
  );

  // Etappe 1+2: Drift-Detector — pure Diagnose über die Dashboard-Konfiguration
  // gegen die aktuelle Strukturwirklichkeit (Themenfelder, Aufgaben, Lernpakete).
  // Banner-Anzeige im Architekt; keine Schreibaktionen in dieser Etappe.
  const driftReport = useDashboardDrift({
    konfiguration,
    themenfelder,
    aufgaben,
    lernpakete,
    systemBausteine,
  });
  const driftForActiveLerntyp = driftReport?.[activeLernTyp] || null;
  const getAmpelStatusForItem = useCallback(
    (item) => getAmpelStatus(item, ampelCtx),
    [ampelCtx]
  );

  // ── Pfad-Status + RBAC ──────────────────────────────────────────────
  const { data: pfadStatusData } = useLernpfadStatus(einheit?.id, activeLernTyp);
  const pfadStatus = pfadStatusData?.status || PFAD_STATUS.EMPTY;
  const istPfadGesperrt = pfadStatus === PFAD_STATUS.LOCKED;

  const { rolle, faecher } = useRBAC();
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaftFuerFach =
    rolle === ROLLEN.FACHSCHAFT &&
    Array.isArray(faecher) && einheit?.fach && faecher.includes(einheit.fach);
  const darfFreigeben = kannBearbeiten === true;
  const darfEntsperren = istAdmin || istFachschaftFuerFach;

  const lerntypLabel = useMemo(
    () => LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label || activeLernTyp,
    [activeLernTyp]
  );

  // ── Re-Sync der Konfiguration aus dem Einheit-Snapshot ──
  // Greift nur:
  //   (a) bei Wechsel der Einheit (einheit.id) – initial laden,
  //   (b) bei Wechsel von Edit ↔ Lesemodus – nach „Bearbeitung beenden"
  //       den frisch persistierten Stand übernehmen.
  // NICHT bei jedem Re-Render im Edit-Modus, weil sonst der lokale,
  // gerade frisch eingefügte Standard-Raster-State von einem stale
  // Server-Snapshot überschrieben werden könnte (Race mit dem Save).
  const lastSyncedEinheitId = useRef(null);
  useEffect(() => {
    if (isStructuralEditingActive) return; // Edit-Modus: lokaler State ist führend.
    if (lastSyncedEinheitId.current === einheit?.id) return; // gleiche Einheit, kein Re-Sync.
    lastSyncedEinheitId.current = einheit?.id;
    const serverKonfig = einheit?.lernpfade_konfiguration || DEFAULT_KONFIG;
    setKonfiguration(serverKonfig);
    konfigurationRef.current = serverKonfig;
  }, [einheit?.id, einheit?.lernpfade_konfiguration, isStructuralEditingActive]);

  // Beim Beenden des Edit-Modus: den Server-Snapshot übernehmen, damit der
  // Lese-Modus den persistierten Stand zeigt — ABER NUR, wenn der Server-
  // Snapshot tatsächlich frischer/vollständiger ist. Schutz vor dem Race:
  // Wenn der Workspace-Parent den Refetch noch nicht durch hat, sehen wir
  // hier u. U. die ALTE einheit.lernpfade_konfiguration als Prop. Würden
  // wir die einfach übernehmen, ginge der gerade frisch gespeicherte State
  // verloren ("Dashboards komplett leer"-Bug). Heuristik: Wenn der lokale
  // State nicht-leer ist und mehr Sektoren enthält als der Server-Prop,
  // behalten wir den lokalen Stand. Sobald der Refetch greift, bringt der
  // erste useEffect oben (lastSyncedEinheitId-Path) ohnehin den Sync.
  const wasEditingActive = useRef(false);
  useEffect(() => {
    if (wasEditingActive.current && !isStructuralEditingActive) {
      const serverKonfig = einheit?.lernpfade_konfiguration || DEFAULT_KONFIG;
      const local = konfigurationRef.current || DEFAULT_KONFIG;
      const sumSektoren = (k) =>
        ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']
          .reduce((acc, lt) => acc + (Array.isArray(k?.[lt]) ? k[lt].length : 0), 0);
      const serverHasMoreOrEqual = sumSektoren(serverKonfig) >= sumSektoren(local);
      if (serverHasMoreOrEqual) {
        setKonfiguration(serverKonfig);
        konfigurationRef.current = serverKonfig;
      }
      // Sonst: lokal behalten — der nächste Refetch synchronisiert.
    }
    wasEditingActive.current = isStructuralEditingActive;
  }, [isStructuralEditingActive, einheit?.lernpfade_konfiguration]);

  // ── Phase E.4: Drift-Report (Sektor-Badges) ─────────────────────────
  // Initial-Load + manueller Refresh; wird auch direkt aus der
  // syncLernpfadMembership-Response gespeist (siehe `applyDriftReport`
  // unten via `onDriftReport`-Callback in useDashboardSync).
  const {
    isLoading: driftReportLoading,
    applyDriftReport,
    getStatus: getDriftStatus,
  } = useLernpfadDriftReport(einheit?.id);

  // ── Sync-Hook (debounced Save + Junction-Sync + Toasts) ─────────────
  const { saveState, scheduleSave, flushSave, hasPending } = useDashboardSync({
    einheitId: einheit?.id,
    isStructuralEditingActive,
    onDriftReport: applyDriftReport,
  });

  // Parent (Workspace) kann via flushRef synchron einen Save erzwingen,
  // bevor er den Struktur-Lock freigibt. Wir geben hier eine Wrapper-Funktion
  // weiter, die IMMER den aktuellen lokalen State (alle 4 Lerntypen!) als
  // forcePayload mitschickt — egal ob pendingPayloadRef gerade gefüllt ist
  // oder nicht. Das schützt vor Datenverlust, wenn z. B. der Standard-
  // Raster-Apply zwar `setKonfiguration` aufgerufen, aber der Debounce-
  // Timer schon abgelaufen war oder ein anderer Save in flight ist.
  useEffect(() => {
    if (!flushRef) return undefined;
    const wrappedFlush = async () => {
      // Snapshot des aktuellen lokalen States als Sicherheitsnetz.
      const snapshot = konfigurationRef.current || DEFAULT_KONFIG;
      await flushSave(snapshot);
    };
    flushRef.current = wrappedFlush;
    return () => {
      if (flushRef.current === wrappedFlush) flushRef.current = null;
    };
  }, [flushRef, flushSave]);

  // konfigurationRef hält den aktuellen State synchron lesbar – wichtig, weil
  // der setState-Updater nur LESEN darf (keine Side-Effects). Wir berechnen
  // also `next` synchron, setzen den State UND rufen scheduleSave separat auf.
  // Damit ist garantiert, dass JEDE Mutation (auch reine Hüllen-Erstellung
  // ohne Aufgaben-IDs) zuverlässig zum Save geschickt wird.
  const konfigurationRef = useRef(konfiguration);
  useEffect(() => {
    konfigurationRef.current = konfiguration;
  }, [konfiguration]);

  // Auto-Assembly: Status pro Dashboard ('auto' | 'bearbeitet' | 'bestaetigt').
  // Muss VOR updateKonfiguration stehen, weil jede manuelle Mutation ein
  // 'auto'-Dashboard automatisch auf 'bearbeitet' hebt.
  const {
    autoStatusMap,
    markLerntypAutoAssembled,
    markAllAutoAssembled,
    markLerntypBearbeitet,
    confirmAutoDashboard,
    confirmIfAuto,
  } = useDashboardAutoStatus(einheit, toast);

  const updateKonfiguration = useCallback(
    (updater, options = {}) => {
      const prev = konfigurationRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      konfigurationRef.current = next;
      setKonfiguration(next);
      scheduleSave(next);
      // Zustand „Bearbeitet": erste manuelle Änderung an einem automatisch
      // erstellten Dashboard (No-op für andere Zustände / Onboarding).
      // options.silent = programmatische Mutationen (Standard-Reset,
      // Titel-Binding) — die zählen NICHT als manuelle Bearbeitung.
      if (!options.silent) markLerntypBearbeitet(activeLernTyp);
    },
    [scheduleSave, markLerntypBearbeitet, activeLernTyp]
  );

  // ── Phase B: Live-Titel-Binding für Arbeitsphase-Sektoren ──────────
  // Bei Änderung der Themenfeld-Titel werden alle Arbeitsphase-Sektoren
  // (über alle Lerntypen) aktualisiert. Snapshot hat Vorrang — gelockte
  // Pfade bleiben stabil, auch wenn das Themenfeld später umbenannt wird.
  // Läuft nur im Edit-Modus, damit der Save nicht aus reinen Lese-Sessions
  // getriggert wird.
  useEffect(() => {
    if (!isStructuralEditingActive) return;
    if (!themenfeldTitelById || themenfeldTitelById.size === 0) return;
    const current = konfigurationRef.current || DEFAULT_KONFIG;
    let changed = false;
    const next = {};
    for (const lt of ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert']) {
      const sektoren = Array.isArray(current[lt]) ? current[lt] : [];
      next[lt] = sektoren.map((s) => {
        if (s.sektor_typ !== SEKTOR_TYP.ARBEITSPHASE) return s;
        if (s.titel_snapshot) return s; // gelockt
        const tfTitel = themenfeldTitelById.get(s.themenfeld_id);
        if (!tfTitel || s.titel === tfTitel) return s;
        changed = true;
        return { ...s, titel: tfTitel };
      });
    }
    if (changed) updateKonfiguration(() => next, { silent: true });
  }, [themenfeldTitelById, isStructuralEditingActive, updateKonfiguration]);

  // ── Lazy-Init für Bestandseinheiten ────────────────────────────────
  // Neue Einheiten werden serverseitig (createEinheitMitDefaults /
  // createEinheitSecure) bereits mit den Default-Templates gespeichert.
  // Bestandseinheiten, die vor dem Rollout angelegt wurden, haben eine
  // leere lernpfade_konfiguration. Diese werden beim ersten Aufruf
  // organisch mit den Standard-Rastern befüllt und persistiert.
  // Läuft NUR ein einziges Mal pro Einheit (lazyInitDoneRef) und nur,
  // wenn die Konfiguration tatsächlich leer ist.
  const lazyInitDoneRef = useRef(null);
  useEffect(() => {
    if (!einheit?.id) return;
    if (lazyInitDoneRef.current === einheit.id) return;
    // PRO Lerntyp prüfen: Nur Dashboards, die noch komplett leer sind,
    // werden automatisch aufgebaut. Bereits bearbeitete/bestehende Pfade
    // (z. B. Bestandsdaten in einem einzelnen Lerntyp) bleiben unangetastet.
    const serverKonfig = einheit.lernpfade_konfiguration || {};
    const emptyLerntypen = VALID_LERNTYPEN.filter(
      (lt) => !Array.isArray(serverKonfig[lt]) || serverKonfig[lt].length === 0
    );
    if (emptyLerntypen.length === 0) {
      lazyInitDoneRef.current = einheit.id;
      return;
    }
    // Auto-Assembly: erst starten, wenn ALLE Struktur-Queries geantwortet
    // haben (Themenfelder, Aufgaben, Lernpakete, System-Bausteine) — sonst
    // würden Arbeitsphasen fehlen oder die Bündel leer bleiben.
    if (themenfelderLoading || aufgabenLoading || lernpaketeLoading || bausteineLoading) return;
    lazyInitDoneRef.current = einheit.id;
    const ctx = { aufgaben, lernpakete, systemBausteineById };
    let filled = { ...DEFAULT_KONFIG, ...serverKonfig };
    for (const lt of emptyLerntypen) {
      if (!Array.isArray(effectiveTemplates?.[lt])) continue;
      filled = autoAssembleLerntyp(filled, lt, effectiveTemplates[lt], themenfelder, ctx);
    }
    setKonfiguration(filled);
    konfigurationRef.current = filled;
    // Direkter Save via flushSave(forcePayload) — kein Edit-Lock erforderlich,
    // weil die betroffenen Dashboards vorher schlicht leer waren.
    flushSave(filled).catch((err) => {
      console.warn('[LernpfadeCockpit] Auto-Assembly Save fehlgeschlagen:', err);
    });
    // Nur die automatisch aufgebauten Dashboards als 'auto' markieren.
    markAllAutoAssembled(emptyLerntypen);
  }, [
    einheit?.id,
    einheit?.lernpfade_konfiguration,
    flushSave,
    themenfelder,
    effectiveTemplates,
    themenfelderLoading,
    aufgabenLoading,
    lernpaketeLoading,
    bausteineLoading,
    aufgaben,
    lernpakete,
    systemBausteineById,
    markAllAutoAssembled,
  ]);

  // Prüf-Status der vier Arbeitspläne (geprüft/in Bearbeitung) für die
  // Lerntyp-Pills. Eine formale Einheiten-Freigabe gibt es nicht mehr.
  const { data: einheitFreigabe } = useEinheitFreigabeStatus(einheit?.id);

  // ── Read-Only-Ableitung ─────────────────────────────────────────────
  const readOnly =
    !isStructuralEditingActive ||
    isLockedByOther ||
    istPfadGesperrt;

  const usedAufgabenIds = useMemo(
    () => getUsedAufgabenIds(konfiguration, activeLernTyp),
    [konfiguration, activeLernTyp]
  );

  // Phase B: bereits im aktiven Lerntyp verknüpfte Themenfeld-IDs für den
  // ArbeitsphaseModal-Picker (ausgrauen).
  const belegteThemenfeldIds = useMemo(() => {
    const set = new Set();
    const sektoren = konfiguration?.[activeLernTyp] || [];
    for (const s of sektoren) {
      if (s.sektor_typ === SEKTOR_TYP.ARBEITSPHASE && s.themenfeld_id) {
        set.add(s.themenfeld_id);
      }
    }
    return set;
  }, [konfiguration, activeLernTyp]);

  // ── Release-Hook (Lock/Unlock + Template + Blocker-Modal) ───────────
  const onTemplateApplied = useCallback(() => {
    setSelectedAufgabeIdState(null);
    setSelectedSystemBausteinIdState(null);
    setIsGuideOpen(false);
  }, []);

  const {
    statusBusy,
    blockerOpen,
    setBlockerOpen,
    blockers,
    handleReleasePath,
    handleUnlockPath,
    handleApplyTemplate,
    confirmOpen,
    setConfirmOpen,
    confirmSummary,
    confirmReleasePath,
    resetConfirmOpen,
    setResetConfirmOpen,
    confirmResetTemplate,
  } = useDashboardRelease({
    einheitId: einheit?.id,
    activeLernTyp,
    konfiguration,
    aufgabenById,
    getAmpelStatusForItem,
    istPfadGesperrt,
    darfFreigeben,
    darfEntsperren,
    flushSave,
    hasPendingSave: hasPending,
    updateKonfiguration,
    onTemplateApplied,
    lerntypLabel,
    // Phase E: durchreichen, damit „Standard zurücksetzen" pro Themenfeld
    // einen eigenen Arbeitsphase-Sektor anlegt.
    themenfelder,
    // Admin-editierbare Standard-Vorlage des aktiven Lerntyps (DB > Hardcode).
    resetTemplate: istBlock
      ? UEBUNGSBLOCK_TEMPLATE
      : getEffectiveTemplateForLerntyp(dashboardVorlagen, activeLernTyp),
    // Auto-Assembly: Bündel beim Standard-Aufbau automatisch befüllen,
    // danach das Dashboard als „automatisch erstellt" markieren. Eine
    // erfolgreiche Prüf-Markierung gilt zugleich als Bestätigung.
    autoFillCtx: { aufgaben, lernpakete, systemBausteineById },
    onAutoAssembled: markLerntypAutoAssembled,
    onPathReleased: confirmIfAuto,
  });

  // ── DnD-Hook (Phase 3.4) ────────────────────────────────────────────
  // `usedAufgabenIds` wird nicht mehr durchgereicht – der canDrop-Validator
  // im Hook berechnet das Duplikat-Verbot selbst aus der aktuellen Konfig.
  const {
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    getIsDropDisabled,
  } = useDashboardDragAndDrop({
    activeLernTyp,
    readOnly,
    konfiguration,
    systemBausteineById,
    aufgabenById,
    updateKonfiguration,
    // Muss mit der Sektor-Ansicht übereinstimmen: Kinder zugeklappter Bündel
    // werden nicht gerendert und dürfen bei der Positionsberechnung des Drops
    // deshalb nicht mitgezählt werden.
    expandedBundles,
  });

  // ── Sektor-Handler ──────────────────────────────────────────────────
  // Phase B: AddSektor bekommt direkt einen `sektor_typ` (siehe AddSektorMenu).
  // - SEKTOR_TYP.ARBEITSPHASE → Modal öffnen, Themenfeld wählen
  // - SEKTOR_TYP.ZWISCHENTEST → Sektor mit Zwischentest-Template anlegen
  // - SEKTOR_TYP.INDIVIDUELL  → leerer Sektor
  const handleAddSektor = useCallback(
    (sektorTyp = SEKTOR_TYP.INDIVIDUELL) => {
      if (readOnly) return;
      if (sektorTyp === SEKTOR_TYP.ARBEITSPHASE) {
        setArbeitsphaseModalOpen(true);
        return;
      }
      if (sektorTyp === SEKTOR_TYP.ZWISCHENTEST) {
        const tpl = getSektorTemplate(SEKTOR_TEMPLATE_KEYS.ZWISCHENTEST);
        const sektor = createNewSektor({
          titel: tpl.titel,
          items: tpl.items,
          sektor_typ: SEKTOR_TYP.ZWISCHENTEST,
        });
        updateKonfiguration((prev) => addSektor(prev, activeLernTyp, sektor));
        return;
      }
      if (sektorTyp === SEKTOR_TYP.FEEDBACK) {
        // Singleton-Check: pro Lerntyp nur ein Feedback-Sektor.
        const existing = (konfigurationRef.current?.[activeLernTyp] || []).some(
          (s) => s?.sektor_typ === SEKTOR_TYP.FEEDBACK
        );
        if (existing) {
          toast({
            title: 'Feedback-Sektor existiert bereits',
            description: 'Pro Intensitätsstufe gibt es genau einen Feedback-Sektor – er steht immer am Ende.',
          });
          return;
        }
        const sektor = createNewSektor({
          titel: 'Feedback',
          sektor_typ: SEKTOR_TYP.FEEDBACK,
          items: [
            { type: 'system', ref_id: 'sys_feedback' },
          ],
        });
        updateKonfiguration((prev) => addSektor(prev, activeLernTyp, sektor));
        return;
      }
      // Default: leerer Sektor (individuell).
      const sektor = createNewSektor({
        titel: 'Neuer Sektor',
        items: [],
        sektor_typ: SEKTOR_TYP.INDIVIDUELL,
      });
      updateKonfiguration((prev) => addSektor(prev, activeLernTyp, sektor));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // Confirm aus dem ArbeitsphaseModal: legt ggf. eine Themenfeld-Hülle an
  // (wenn die Einheit noch keine Themenfelder hat) und erzeugt anschließend
  // den Arbeitsphase-Sektor mit Live-Titel-Binding.
  const handleConfirmArbeitsphase = useCallback(
    async ({ themenfeldId, themenfeldTitel }) => {
      if (readOnly) return;
      setArbeitsphaseModalBusy(true);
      try {
        let tfId = themenfeldId;
        let tfTitel = themenfeldTitel;
        if (!tfId && einheit?.id) {
          // Auto-Hülle anlegen.
          const created = await createThemenfeld({
            einheitId: einheit.id,
            titel: 'Themenfeld Platzhalter',
            reihenfolge: (themenfelder?.length || 0) + 1,
          });
          tfId = created.id;
          tfTitel = created.titel || 'Themenfeld Platzhalter';
          queryClient.invalidateQueries({ queryKey: ['themenfelder-by-einheit', einheit.id] });
          toast({
            title: 'Themenfeld-Hülle angelegt',
            description: 'Du kannst sie später im Strukturboard umbenennen.',
          });
        }
        const sektor = createNewSektor({
          titel: tfTitel || 'Themenfeld',
          // Standardraster für diesen Lerntyp übernehmen (analog zum
          // Default-Dashboard-Template und zur Drift-Resolution).
          items: getArbeitsphaseDefaultItems(activeLernTyp, { istUebungsblock: istBlock }),
          sektor_typ: SEKTOR_TYP.ARBEITSPHASE,
          themenfeld_id: tfId,
        });
        updateKonfiguration((prev) => addSektor(prev, activeLernTyp, sektor));
        setArbeitsphaseModalOpen(false);
      } catch (err) {
        console.error('[Cockpit] Arbeitsphase-Sektor anlegen fehlgeschlagen:', err);
        toast({
          variant: 'destructive',
          title: 'Anlegen fehlgeschlagen',
          description: err?.message || 'Bitte erneut versuchen.',
        });
      } finally {
        setArbeitsphaseModalBusy(false);
      }
    },
    [readOnly, einheit?.id, themenfelder, queryClient, toast, updateKonfiguration, activeLernTyp]
  );

  // Phase B: Typ-Wechsel auf leeren Sektoren.
  // - Wechsel auf ARBEITSPHASE wird hier NICHT direkt erlaubt — der Sektor
  //   müsste ja zwingend ein Themenfeld bekommen. Da wir den Wechsel nur
  //   für leere Sektoren anbieten und die UI Arbeitsphase im Switch-Menu
  //   listet, leiten wir auf "Sektor löschen + neu via Modal" um, indem
  //   wir das Modal öffnen und nach Confirm den alten Sektor patchen.
  //   Pragmatischere Lösung: Wechsel auf ARBEITSPHASE schlicht blockieren,
  //   damit bleibt der Code einfach und konsistent (Lehrkraft löscht den
  //   leeren Sektor und legt eine Arbeitsphase neu an).
  const handlePatchSektor = useCallback(
    (sektorId, patch) => {
      if (readOnly) return;
      // Typ-Wechsel auf Arbeitsphase: in Phase B nicht über Patch erlaubt –
      // bitte Sektor löschen und neu anlegen.
      if (patch?.sektor_typ === SEKTOR_TYP.ARBEITSPHASE) {
        toast({
          title: 'Bitte neu anlegen',
          description:
            'Eine Arbeitsphase muss mit einem Themenfeld verknüpft werden – lege sie über „Sektor hinzufügen" → „Arbeitsphase Themenfeld" neu an.',
        });
        return;
      }
      updateKonfiguration((prev) => patchSektor(prev, activeLernTyp, sektorId, patch));
    },
    [readOnly, activeLernTyp, updateKonfiguration, toast]
  );

  const handleRemoveSektor = useCallback(
    (sektorId) => {
      if (readOnly) return;
      updateKonfiguration((prev) => removeSektor(prev, activeLernTyp, sektorId));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // Sektor-Reihenfolge ändern (Hoch/Runter-Pfeile im Sektor-Header).
  const handleMoveSektor = useCallback(
    (sektorId, direction) => {
      if (readOnly) return;
      updateKonfiguration((prev) => moveSektor(prev, activeLernTyp, sektorId, direction));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleRemoveAufgabeFromPath = useCallback(
    (aufgabeId) => {
      if (readOnly) return;
      updateKonfiguration((prev) => removeAufgabeFromLernTyp(prev, activeLernTyp, aufgabeId));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // Etappe 2 (Auto-Assembly): „Neue Inhalte" aus dem Drift-Report per Klick
  // in ihr Ziel-Bündel einsortieren. Ist das Dashboard bereits bestätigt,
  // startet das Item INAKTIV — der bestätigte Pfad ändert sich für Schüler
  // erst, wenn die Lehrkraft es bewusst aktiviert (Augen-Symbol).
  const dashboardBestaetigt =
    autoStatusMap?.[activeLernTyp] === AUTO_DASHBOARD_STATUS.BESTAETIGT;

  // ── Drift-Auflösungen (Banner-Aktionen) ─────────────────────────────
  const {
    handleDriftAddSektor,
    handleDriftRemoveSektor,
    handleDriftRemoveItem,
    handleDriftAddItem,
  } = useDashboardDriftHandlers({
    readOnly,
    activeLernTyp,
    updateKonfiguration,
    dashboardBestaetigt,
    toast,
  });

  // ── Bündel- und Element-Handler ─────────────────────────────────────
  const {
    cascadeDialog,
    setCascadeDialog,
    confirmCascadeDelete,
    removeBundle: handleRemoveBundle,
    handleSetBundleConfig,
    handleSetBundleModus,
    handleToggleItemAktiv,
    handleSetLernpaketZugang,
    handleAutoFillBundle,
    handleRemoveSystemItem,
  } = useDashboardBundleHandlers({
    readOnly,
    activeLernTyp,
    konfigurationRef,
    updateKonfiguration,
    systemBausteineById,
    aufgaben,
    lernpakete,
    toast,
  });

  // ── Monitor-Selection ──────────────────────────────────────────────
  const selectedAufgabe = useMemo(
    () => (selectedAufgabeId ? aufgabenById.get(selectedAufgabeId) || null : null),
    [aufgabenById, selectedAufgabeId]
  );
  const selectedSystemBaustein = useMemo(
    () =>
      selectedSystemBausteinId
        ? systemBausteineById.get(selectedSystemBausteinId) || null
        : null,
    [systemBausteineById, selectedSystemBausteinId]
  );

  // Save-Indicator als kompaktes Icon (statt eigener Zeile).
  const saveIndicator = (() => {
    if (saveState === 'pending') return { icon: Cloud, cls: 'text-muted-foreground', title: 'Änderung registriert…' };
    if (saveState === 'saving') return { icon: Loader2, cls: 'text-muted-foreground animate-spin', title: 'Speichere…' };
    if (saveState === 'saved') return { icon: Check, cls: 'text-emerald-600', title: 'Gespeichert' };
    if (saveState === 'error') return { icon: CloudOff, cls: 'text-destructive', title: 'Keine Verbindung – Änderungen sind gemerkt und werden automatisch nachgeschickt. Fenster geöffnet lassen.' };
    return null;
  })();
  const SaveIcon = saveIndicator?.icon;

  // Scroll-Ref für Auto-Hide-Verhalten in Sub-Komponenten (z. B. zukünftige
  // Header-Auto-Hide-Logik). Aktuell nicht aktiv, bleibt aber als stabiler Ref
  // erhalten, falls der Architekt ihn nutzen will.
  const scrollRef = useRef(null);

  // Phase F.2: Deep-Link-Scroll. Wenn beim Mount eine `?sektor=...`-ID
  // mitgegeben wurde, scrollen wir den passenden Sektor sanft ins Bild,
  // sobald (a) der richtige Lerntyp aktiv ist und (b) die DOM-Knoten
  // gerendert sind. Das LernpfadeSektor markiert seinen Container mit
  // `data-sektor-id`, daher reicht ein `querySelector`. Nach Erfolg leeren
  // wir die Ref, damit der Effekt nicht in Schleife scrollt.
  useEffect(() => {
    const targetId = pendingScrollSektorRef.current;
    if (!targetId) return;
    if (!scrollRef.current) return;
    // Kurzes Polling: das Cockpit braucht einen Render-Tick, bevor die
    // Sektor-Liste tatsächlich im DOM steht (besonders nach Tab-Wechsel
    // mit `?lerntyp=`-Sync).
    let attempts = 0;
    const tryScroll = () => {
      const root = scrollRef.current;
      if (!root) return;
      const el = root.querySelector(`[data-sektor-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Visuell kurz hervorheben, damit klar wird, „hier bin ich gelandet".
        el.classList.add('ring-2', 'ring-primary/60', 'ring-offset-2');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-primary/60', 'ring-offset-2');
        }, 1800);
        pendingScrollSektorRef.current = null;
        return;
      }
      attempts += 1;
      if (attempts < 10) setTimeout(tryScroll, 80);
    };
    tryScroll();
  }, [activeLernTyp, konfiguration]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 30/70-Layout mit DnD-Kontext */}
      <DragDropContext
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          <aside className="w-full lg:w-[30%] lg:min-w-[280px] lg:max-w-[420px] border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col overflow-hidden h-72 lg:h-auto shrink-0">
            <LernpfadeAufgabenPool
              einheitId={einheit?.id}
              usedAufgabenIds={usedAufgabenIds}
              selectedAufgabe={selectedAufgabe}
              selectedSystemBaustein={selectedSystemBaustein}
              onSelectAufgabe={setSelectedAufgabeId}
              onSelectSystemBaustein={setSelectedSystemBausteinId}
            />
          </aside>

          <main className="flex-1 overflow-hidden min-h-0 flex flex-col">
            {/* Konsolidierte EINE-Zeile-Toolbar: Status, Lerntyp-Pills,
                Drift-Pill, Guide, Release-Aktionen, Bearbeitung beenden,
                Save-Indicator. */}
            <DashboardToolbar
              konfiguration={konfiguration}
              activeLernTyp={activeLernTyp}
              onActiveLernTypChange={handleActiveLernTypChange}
              einheitFreigabe={einheitFreigabe}
              istPfadGesperrt={istPfadGesperrt}
              darfFreigeben={darfFreigeben}
              darfEntsperren={darfEntsperren}
              pfadStatusBusy={statusBusy}
              onReleasePath={handleReleasePath}
              onUnlockPath={handleUnlockPath}
              onOpenGuide={() => setIsGuideOpen(true)}
              onOpenPreview={previews.openDashboard}
              isStructuralEditingActive={isStructuralEditingActive}
              isEndingEdit={isEndingEdit}
              onEndEditing={onEndEditing}
              saveIcon={SaveIcon}
              saveIconCls={saveIndicator?.cls}
              saveTitle={saveIndicator?.title}
              driftForActiveLerntyp={driftForActiveLerntyp}
              onDriftAddSektor={handleDriftAddSektor}
              onDriftRemoveSektor={handleDriftRemoveSektor}
              onDriftRemoveItem={handleDriftRemoveItem}
              onDriftAddItem={handleDriftAddItem}
              driftAddItemInaktiv={dashboardBestaetigt}
              driftDisabled={readOnly}
              allExpanded={allExpanded}
              onToggleExpandAll={handleToggleExpandAll}
              autoStatus={autoStatusMap?.[activeLernTyp] || null}
              autoStatusByLerntyp={autoStatusMap}
              onConfirmAuto={() => confirmAutoDashboard(activeLernTyp)}
              zeigeLerntypenSchalter={istPrivat}
              aktiveLerntypen={aktiveLerntypen}
              onToggleLerntyp={handleToggleLerntyp}
              modusBusy={modusBusy}
              lerntypNamen={lerntypNamen}
            />
            <div className="flex-1 overflow-hidden min-h-0">
              {activeLernTyp === 'onboarding' ? (
                <OnboardingTab
                  onboardingKonfig={onboardingSnapshots}
                  onPreviewEinfuehrung={previews.openEinfuehrung}
                  onPreviewQblock={previews.openQblock}
                  onPreviewDiagnoseQuiz={previews.openDiagnoseQuiz}
                  onPreviewLerntypDiagnose={previews.openLerntypDiagnose}
                />
              ) : (
              <LernpfadeArchitekt
                einheitId={einheit?.id}
                konfiguration={konfiguration}
                activeLernTyp={activeLernTyp}
                onActiveLernTypChange={handleActiveLernTypChange}
                readOnly={readOnly}
                aufgabenById={aufgabenById}
                systemBausteineById={systemBausteineById}
                onAddSektor={handleAddSektor}
                onPatchSektor={handlePatchSektor}
                onRemoveSektor={handleRemoveSektor}
                onMoveSektor={handleMoveSektor}
                onRemoveAufgabeFromPath={handleRemoveAufgabeFromPath}
                onRemoveSystemItem={handleRemoveSystemItem}
                onRemoveBundle={handleRemoveBundle}
                onSetBundleConfig={handleSetBundleConfig}
                onSetBundleModus={handleSetBundleModus}
                onAutoFillBundle={handleAutoFillBundle}
                onToggleItemAktiv={handleToggleItemAktiv}
                onSetLernpaketZugang={handleSetLernpaketZugang}
                expandedSektoren={expandedSektoren}
                onToggleSektorExpanded={toggleSektorExpanded}
                expandedBundles={expandedBundles}
                onToggleBundleExpanded={toggleBundleExpanded}
                getIsDropDisabled={getIsDropDisabled}
                onSelectAufgabe={setSelectedAufgabeId}
                onSelectSystemBaustein={setSelectedSystemBausteinId}
                selectedAufgabeId={selectedAufgabeId}
                selectedSystemBausteinId={selectedSystemBausteinId}
                getAmpelStatusForItem={getAmpelStatusForItem}
                onOpenAufgabeEditor={handleOpenAufgabeEditor}
                onOpenLernpaket={handleOpenLernpaket}
                onOpenGuide={() => setIsGuideOpen(true)}
                canvasScrollRef={scrollRef}
                themenfeldTitelById={themenfeldTitelById}
                getDriftStatus={getDriftStatus}
                driftReportLoading={driftReportLoading}
                onPreviewEinfuehrung={previews.openEinfuehrung}
                onPreviewQblock={previews.openQblock}
                onPreviewDiagnoseQuiz={previews.openDiagnoseQuiz}
                onPreviewThemenfeldIntro={(ctx) =>
                  previews.openThemenfeldIntro({ ...ctx, lerntyp: activeLernTyp })
                }
              />
              )}
            </div>
          </main>
        </div>
      </DragDropContext>

      <CockpitPreviewModals
        previews={previews}
        einheit={einheit}
        activeLernTyp={activeLernTyp}
        sektoren={konfiguration?.[activeLernTyp] || []}
        aufgabenById={aufgabenById}
        systemBausteineById={systemBausteineById}
      />

      <ReleaseBlockerModal
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
        blockers={blockers}
        lerntypLabel={lerntypLabel}
        onOpenEditor={(aufgabe) => {
          setBlockerOpen(false);
          handleOpenAufgabeEditor(aufgabe);
        }}
      />

      <ReleaseConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        lerntypLabel={lerntypLabel}
        sektorCount={confirmSummary.sektorCount}
        itemCount={confirmSummary.itemCount}
        aufgabenCount={confirmSummary.aufgabenCount}
        busy={statusBusy}
        onConfirm={confirmReleasePath}
      />

      <DidaktischerGuidePanel
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lerntyp={activeLernTyp}
        isLocked={istPfadGesperrt}
        onApplyClick={handleApplyTemplate}
      />

      <ResetDashboardConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        lerntypLabel={lerntypLabel}
        busy={statusBusy}
        onConfirm={confirmResetTemplate}
      />

      <CascadeDeleteDialog
        open={!!cascadeDialog}
        onOpenChange={(v) => { if (!v) setCascadeDialog(null); }}
        bundleTitle={cascadeDialog?.bundleTitle}
        childCount={cascadeDialog?.childCount || 0}
        onConfirm={confirmCascadeDelete}
      />

      <ArbeitsphaseModal
        open={arbeitsphaseModalOpen}
        onOpenChange={setArbeitsphaseModalOpen}
        themenfelder={themenfelder}
        belegteThemenfeldIds={belegteThemenfeldIds}
        busy={arbeitsphaseModalBusy}
        onConfirm={handleConfirmArbeitsphase}
      />

      <AufgabeCreateView
        open={!!editorAufgabe}
        onOpenChange={(v) => !v && setEditorAufgabe(null)}
        einheitId={einheit?.id}
        themenfelder={[]}
        initialData={editorAufgabe}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheit?.id] });
        }}
      />
    </div>
  );
}