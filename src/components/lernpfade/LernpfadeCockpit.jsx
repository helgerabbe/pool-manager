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
  removeAufgabeFromLernTyp,
  isKonfigurationEmpty,
  applyAllDashboardTemplates,
  setBundleConfig,
  removeBundleAndCascade,
  getBundleChildren,
} from '@/lib/lernpfadeUtils';
import CascadeDeleteDialog from '@/components/lernpfade/CascadeDeleteDialog';
import { DASHBOARD_TEMPLATES } from '@/lib/dashboardTemplates';
import { getSektorTemplate, SEKTOR_TEMPLATE_KEYS } from '@/lib/sektorTemplates';
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

  // ── State ───────────────────────────────────────────────────────────
  const [konfiguration, setKonfiguration] = useState(
    () => einheit?.lernpfade_konfiguration || DEFAULT_KONFIG
  );
  const [activeLernTyp, setActiveLernTyp] = useState('pragmatiker');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [previewAufgabe, setPreviewAufgabe] = useState(null);
  const [editorAufgabe, setEditorAufgabe] = useState(null);

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

  // Beim Beenden des Edit-Modus: einmalig den Server-Snapshot übernehmen,
  // damit der Lese-Modus den persistierten Stand zeigt.
  const wasEditingActive = useRef(false);
  useEffect(() => {
    if (wasEditingActive.current && !isStructuralEditingActive) {
      const serverKonfig = einheit?.lernpfade_konfiguration || DEFAULT_KONFIG;
      setKonfiguration(serverKonfig);
      konfigurationRef.current = serverKonfig;
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
    lazyInitDoneRef.current = einheit.id;
    const filled = applyAllDashboardTemplates({}, DASHBOARD_TEMPLATES);
    setKonfiguration(filled);
    konfigurationRef.current = filled;
    // Direkter Save via flushSave(forcePayload) — kein Edit-Lock erforderlich,
    // weil die Einheit vorher schlicht keine Konfiguration hatte.
    flushSave(filled).catch((err) => {
      console.warn('[LernpfadeCockpit] Lazy-Init Save fehlgeschlagen:', err);
    });
  }, [einheit?.id, einheit?.lernpfade_konfiguration, flushSave]);

  // ── Read-Only-Ableitung ─────────────────────────────────────────────
  const readOnly = !isStructuralEditingActive || isLockedByOther || istPfadGesperrt;

  const usedAufgabenIds = useMemo(
    () => getUsedAufgabenIds(konfiguration, activeLernTyp),
    [konfiguration, activeLernTyp]
  );

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
  // `templateKey` ist optional: 'erarbeitung' | 'zwischentest' | 'leer'.
  // Ohne Key (Legacy-Aufruf) → leerer Sektor.
  const handleAddSektor = useCallback(
    (templateKey = SEKTOR_TEMPLATE_KEYS.LEER) => {
      if (readOnly) return;
      const tpl = getSektorTemplate(templateKey);
      const sektor = createNewSektor({ titel: tpl.titel, modus: tpl.modus, items: tpl.items });
      updateKonfiguration((prev) => addSektor(prev, activeLernTyp, sektor));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handlePatchSektor = useCallback(
    (sektorId, patch) => {
      if (readOnly) return;
      updateKonfiguration((prev) => patchSektor(prev, activeLernTyp, sektorId, patch));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleRemoveSektor = useCallback(
    (sektorId) => {
      if (readOnly) return;
      updateKonfiguration((prev) => removeSektor(prev, activeLernTyp, sektorId));
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
              onRemoveAufgabeFromPath={handleRemoveAufgabeFromPath}
              onRemoveSystemItem={handleRemoveSystemItem}
              onRemoveBundle={handleRemoveBundle}
              onSetBundleConfig={handleSetBundleConfig}
              getIsDropDisabled={getIsDropDisabled}
              onSelectAufgabe={setSelectedAufgabeId}
              onSelectSystemBaustein={setSelectedSystemBausteinId}
              selectedAufgabeId={selectedAufgabeId}
              selectedSystemBausteinId={selectedSystemBausteinId}
              getAmpelStatusForItem={getAmpelStatusForItem}
              onOpenAufgabeEditor={handleOpenAufgabeEditor}
              onOpenGuide={() => setIsGuideOpen(true)}
              canvasScrollRef={scrollRef}
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