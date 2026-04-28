/**
 * LernpfadeCockpit.jsx
 *
 * Schlanker Orchestrator für Tab 7 „Dashboards" (Lernpfad-Architekt).
 * Hält den Konfigurations-State und delegiert:
 *   - Persistenz       → useDashboardSync
 *   - Drag & Drop      → useDashboardDragAndDrop
 *   - Freigabe/Lock    → useDashboardRelease
 *   - Toolbar-UI       → CockpitActionToolbar
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
// Loader2 wird im Save-Indicator (saving-State) als animiertes Spinner-Icon
// genutzt – siehe `saveIndicator` weiter unten. Nicht entfernen.
import LernpfadeAufgabenPool from '@/components/lernpfade/LernpfadeAufgabenPool';
import LernpfadeArchitekt, { LERN_TYPEN } from '@/components/lernpfade/LernpfadeArchitekt';
import AufgabePreviewDialog from '@/components/lernpfade/AufgabePreviewDialog';
import ReleaseBlockerModal from '@/components/lernpfade/ReleaseBlockerModal';
import ReleaseConfirmDialog from '@/components/lernpfade/ReleaseConfirmDialog';
import DidaktischerGuidePanel from '@/components/lernpfade/DidaktischerGuidePanel';
import { useLernpfadStatus } from '@/hooks/useLernpfadStatus';
import { useDashboardSync } from '@/hooks/useDashboardSync';
import { useDashboardDragAndDrop } from '@/hooks/useDashboardDragAndDrop';
import { useDashboardRelease } from '@/hooks/useDashboardRelease';
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
  isKonfigurationEmpty,
  applyAllDashboardTemplates,
  setBundleConfig,
  setBundleModus,
  removeBundleAndCascade,
  getBundleChildren,
  getAutoFillCandidates,
  bulkAddItemsToBundle,
} from '@/lib/lernpfadeUtils';
import { getBundleKindByAcceptedTypes } from '@/lib/sektorTypen';
import CascadeDeleteDialog from '@/components/lernpfade/CascadeDeleteDialog';
import ArbeitsphaseModal from '@/components/lernpfade/ArbeitsphaseModal.jsx';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { getSektorTemplate, SEKTOR_TEMPLATE_KEYS } from '@/lib/sektorTemplates';
import { SEKTOR_TYP } from '@/lib/sektorTypen';
import { getThemenfelderByEinheit, createThemenfeld } from '@/services/ThemenfeldService';
import { useToast } from '@/components/ui/use-toast';
import ResetDashboardConfirmDialog from '@/components/lernpfade/ResetDashboardConfirmDialog';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { getAmpelStatus } from '@/lib/ampelLogic';
import { adaptLernpaketToPoolItem } from '@/lib/lernpaketAdapter';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';

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

  useEffect(() => {
    if (searchParams.get('lerntyp')) {
      const next = new URLSearchParams(searchParams);
      next.delete('lerntyp');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [previewAufgabe, setPreviewAufgabe] = useState(null);
  const [editorAufgabe, setEditorAufgabe] = useState(null);
  const [arbeitsphaseModalOpen, setArbeitsphaseModalOpen] = useState(false);
  const [arbeitsphaseModalBusy, setArbeitsphaseModalBusy] = useState(false);

  // Phase 3.5: Cascade-Delete-Dialog State.
  // Wird nur gefüllt, wenn ein Bündel mit Kindern gelöscht werden soll.
  // Leere Bündel werden ohne Modal direkt entfernt.
  const [cascadeDialog, setCascadeDialog] = useState(null); // {sektorId, bundleInstanceId, bundleTitle, childCount}

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

  // ── Daten-Queries ───────────────────────────────────────────────────
  const { data: aufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheit?.id],
    queryFn: () => (einheit?.id ? getAufgabenByEinheit(einheit.id) : Promise.resolve([])),
    enabled: !!einheit?.id,
  });

  const { data: systemBausteine = [] } = useQuery({
    queryKey: ['systemBausteine', 'all'],
    queryFn: () => base44.entities.SystemBausteine.list('reihenfolge'),
  });
  const systemBausteineById = useMemo(() => {
    const map = new Map();
    (systemBausteine || []).forEach((b) => map.set(b.baustein_id, b));
    return map;
  }, [systemBausteine]);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete-by-einheit', einheit?.id],
    queryFn: () =>
      einheit?.id
        ? base44.entities.Lernpakete.filter({ einheit_id: einheit.id })
        : Promise.resolve([]),
    enabled: !!einheit?.id,
  });

  // Phase B: Themenfelder für Arbeitsphase-Modal und Live-Titel-Binding.
  const { data: themenfelder = [] } = useQuery({
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

  // ── Sync-Hook (debounced Save + Junction-Sync + Toasts) ─────────────
  const { saveState, scheduleSave, flushSave, hasPending } = useDashboardSync({
    einheitId: einheit?.id,
    isStructuralEditingActive,
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

  const updateKonfiguration = useCallback(
    (updater) => {
      const prev = konfigurationRef.current;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      konfigurationRef.current = next;
      setKonfiguration(next);
      scheduleSave(next);
    },
    [scheduleSave]
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
    if (changed) updateKonfiguration(() => next);
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
    if (!isKonfigurationEmpty(einheit.lernpfade_konfiguration)) {
      lazyInitDoneRef.current = einheit.id;
      return;
    }
    // Phase E: warten, bis die Themenfeld-Query mindestens einmal geantwortet
    // hat — sonst würden wir nur einen einzigen Arbeitsphase-Sektor anlegen,
    // obwohl die Einheit schon Themenfelder hat. Wenn die Einheit keine
    // Themenfelder hat, läuft der Init mit leerem Array → Fallback auf 1 Sektor.
    if (!themenfelder) return;
    lazyInitDoneRef.current = einheit.id;
    const filled = applyAllDashboardTemplates({}, DASHBOARD_TEMPLATES, themenfelder);
    setKonfiguration(filled);
    konfigurationRef.current = filled;
    // Direkter Save via flushSave(forcePayload) — kein Edit-Lock erforderlich,
    // weil die Einheit vorher schlicht keine Konfiguration hatte.
    flushSave(filled).catch((err) => {
      console.warn('[LernpfadeCockpit] Lazy-Init Save fehlgeschlagen:', err);
    });
  }, [einheit?.id, einheit?.lernpfade_konfiguration, flushSave, themenfelder]);

  // ── Read-Only-Ableitung ─────────────────────────────────────────────
  const readOnly = !isStructuralEditingActive || isLockedByOther || istPfadGesperrt;

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
            description: 'Pro Lerntyp gibt es genau einen Feedback-Sektor – er steht immer am Ende.',
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
          items: [],
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

  // Phase 3.5/3.6: Cascade-Delete eines Bündel-Containers.
  // - Bei leerem Bündel: direkt löschen (kein Modal).
  // - Bei Bündel mit Children: Modal öffnen, Confirm löst Delete aus.
  // Die DB-Bereinigung (Junction-Cleanup für die entfernten Children) erledigt
  // der bestehende `syncLernpfadMembership`-Aufruf im scheduleSave-Pfad
  // automatisch — er gleicht die Junction-Tabelle gegen den neuen Soll-Zustand
  // der `lernpfade_konfiguration` ab und löscht dabei nur die Memberships der
  // Aufgaben, die im aktuellen Lerntyp nicht mehr vorkommen. Andere Lerntypen
  // und Root-Aufgaben des gleichen Lerntyps bleiben unangetastet.
  const handleRemoveBundle = useCallback(
    (sektorId, bundleInstanceId) => {
      if (readOnly) return;
      const children = getBundleChildren(konfigurationRef.current, activeLernTyp, sektorId, bundleInstanceId);
      if (children.length === 0) {
        updateKonfiguration((prev) => {
          const { konfig } = removeBundleAndCascade(prev, activeLernTyp, sektorId, bundleInstanceId);
          return konfig;
        });
        return;
      }
      // Children vorhanden → Modal öffnen.
      const sektor = (konfigurationRef.current?.[activeLernTyp] || []).find((s) => s.sektor_id === sektorId);
      const bundleItem = sektor?.items?.find((it) => it.instance_id === bundleInstanceId);
      const bundleTitle = systemBausteineById?.get(bundleItem?.ref_id)?.titel || 'Bündel';
      setCascadeDialog({
        sektorId,
        bundleInstanceId,
        bundleTitle,
        childCount: children.length,
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration, systemBausteineById]
  );

  const confirmCascadeDelete = useCallback(() => {
    if (!cascadeDialog) return;
    const { sektorId, bundleInstanceId } = cascadeDialog;
    updateKonfiguration((prev) => {
      const { konfig } = removeBundleAndCascade(prev, activeLernTyp, sektorId, bundleInstanceId);
      return konfig;
    });
    setCascadeDialog(null);
  }, [cascadeDialog, activeLernTyp, updateKonfiguration]);

  // Phase 4: Erforderliche-Anzahl am Aufgabenbündel ändern.
  // erforderlicheAnzahl=null setzt die Konfig zurück (Default = "alle Pflicht").
  const handleSetBundleConfig = useCallback(
    (sektorId, bundleInstanceId, erforderlicheAnzahl) => {
      if (readOnly) return;
      updateKonfiguration((prev) =>
        setBundleConfig(prev, activeLernTyp, sektorId, bundleInstanceId, erforderlicheAnzahl)
      );
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // Phase C: Bündel-Modus (sequenziell|frei) am Bündel-Header umschalten.
  // setBundleModus resettet erforderliche_anzahl bei Wechsel auf 'sequenziell'
  // automatisch, damit "X von Y in fester Reihenfolge" nicht entstehen kann.
  const handleSetBundleModus = useCallback(
    (sektorId, bundleInstanceId, modus) => {
      if (readOnly) return;
      updateKonfiguration((prev) =>
        setBundleModus(prev, activeLernTyp, sektorId, bundleInstanceId, modus)
      );
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  // Phase D: Auto-Befüllen leerer Bündel.
  // Verantwortung: BundleKind ableiten, Kandidaten filtern, bulk einfügen,
  // Toast zeigen. Filter-Logik: siehe getAutoFillCandidates in lernpfadeUtils.
  const handleAutoFillBundle = useCallback(
    (sektorId, bundleInstanceId, bundleBaustein) => {
      if (readOnly) return;
      const bundleKind = getBundleKindByAcceptedTypes(bundleBaustein?.accepted_types);
      if (!bundleKind) {
        toast({
          variant: 'destructive',
          title: 'Auto-Befüllen nicht möglich',
          description: 'Dieses Bündel hat keinen erkennbaren Typ.',
        });
        return;
      }
      const sektor = (konfigurationRef.current?.[activeLernTyp] || []).find(
        (s) => s.sektor_id === sektorId
      );
      const themenfeldId = sektor?.themenfeld_id || null;
      const usedAufgabenIds = getUsedAufgabenIds(konfigurationRef.current, activeLernTyp);
      const candidates = getAutoFillCandidates({
        bundleKind,
        themenfeldId,
        aufgaben,
        lernpakete,
        usedAufgabenIds,
      });

      if (candidates.length === 0) {
        toast({
          title: 'Keine passenden Elemente gefunden',
          description:
            bundleKind === 'projekte'
              ? 'In dieser Einheit gibt es noch keine unzugewiesenen Projekte.'
              : !themenfeldId
                ? 'Dieses Bündel ist keinem Themenfeld zugeordnet.'
                : 'Alle passenden Elemente sind bereits in diesem Lernpfad platziert.',
        });
        return;
      }

      let added = 0;
      let skipped = 0;
      updateKonfiguration((prev) => {
        const result = bulkAddItemsToBundle(prev, activeLernTyp, sektorId, bundleInstanceId, candidates);
        added = result.addedCount;
        skipped = result.skippedCount;
        return result.konfig;
      });

      if (added > 0 && skipped === 0) {
        toast({
          title: `${added} ${added === 1 ? 'Element' : 'Elemente'} hinzugefügt`,
          description: 'Das Bündel wurde automatisch befüllt.',
        });
      } else if (added > 0 && skipped > 0) {
        toast({
          title: `${added} hinzugefügt, ${skipped} übersprungen`,
          description: 'Übersprungene Elemente waren bereits im Pfad.',
        });
      } else {
        toast({
          title: 'Keine Elemente hinzugefügt',
          description: 'Alle Kandidaten waren bereits platziert.',
        });
      }
    },
    [readOnly, activeLernTyp, aufgaben, lernpakete, updateKonfiguration, toast]
  );

  // System-Bausteine werden POSITIONS-genau entfernt (nicht per ref_id), weil
  // derselbe Baustein mehrfach in einem Sektor vorkommen darf.
  const handleRemoveSystemItem = useCallback(
    (sektorId, itemIndex) => {
      if (readOnly) return;
      updateKonfiguration((prev) => {
        const sektoren = prev?.[activeLernTyp] || [];
        const next = sektoren.map((s) => {
          if (s.sektor_id !== sektorId) return s;
          const items = [...(s.items || [])];
          if (itemIndex < 0 || itemIndex >= items.length) return s;
          if (items[itemIndex]?.type !== 'system') return s; // safety
          items.splice(itemIndex, 1);
          return { ...s, items };
        });
        return { ...prev, [activeLernTyp]: next };
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

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
    if (saveState === 'error') return { icon: CloudOff, cls: 'text-destructive', title: 'Fehler beim Speichern' };
    return null;
  })();
  const SaveIcon = saveIndicator?.icon;

  // Scroll-Ref für Auto-Hide-Verhalten in Sub-Komponenten (z. B. zukünftige
  // Header-Auto-Hide-Logik). Aktuell nicht aktiv, bleibt aber als stabiler Ref
  // erhalten, falls der Architekt ihn nutzen will.
  const scrollRef = useRef(null);

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
              onPreviewAufgabe={setPreviewAufgabe}
            />
          </aside>

          <main className="flex-1 overflow-hidden min-h-0">
            <LernpfadeArchitekt
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
              getIsDropDisabled={getIsDropDisabled}
              onSelectAufgabe={setSelectedAufgabeId}
              onSelectSystemBaustein={setSelectedSystemBausteinId}
              selectedAufgabeId={selectedAufgabeId}
              selectedSystemBausteinId={selectedSystemBausteinId}
              getAmpelStatusForItem={getAmpelStatusForItem}
              onOpenAufgabeEditor={handleOpenAufgabeEditor}
              onOpenGuide={() => setIsGuideOpen(true)}
              canvasScrollRef={scrollRef}
              themenfeldTitelById={themenfeldTitelById}
              istPfadGesperrt={istPfadGesperrt}
              darfFreigeben={darfFreigeben}
              darfEntsperren={darfEntsperren}
              statusBusy={statusBusy}
              onReleasePath={handleReleasePath}
              onUnlockPath={handleUnlockPath}
              saveIcon={SaveIcon}
              saveIconCls={saveIndicator?.cls}
              saveTitle={saveIndicator?.title}
              isStructuralEditingActive={isStructuralEditingActive}
              isEndingEdit={isEndingEdit}
              onEndEditing={onEndEditing}
            />
          </main>
        </div>
      </DragDropContext>

      <AufgabePreviewDialog
        open={!!previewAufgabe}
        onOpenChange={(v) => !v && setPreviewAufgabe(null)}
        aufgabe={previewAufgabe}
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