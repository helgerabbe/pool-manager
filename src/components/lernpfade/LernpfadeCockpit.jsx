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
} from '@/lib/lernpfadeUtils';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { getAmpelStatus } from '@/lib/ampelLogic';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';

const DEFAULT_KONFIG = { minimalist: [], pragmatiker: [], ehrgeizig: [], passioniert: [] };

export default function LernpfadeCockpit({
  einheit,
  isStructuralEditingActive,
  isLockedByOther,
  kannBearbeiten,
  onEndEditing,
  isEndingEdit = false,
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
  const aufgabenById = useMemo(() => {
    const map = new Map();
    (aufgaben || []).forEach((a) => map.set(a.id, a));
    return map;
  }, [aufgaben]);

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
  // ABER NUR im Lesemodus – im Edit-Modus ist der lokale State führend.
  useEffect(() => {
    if (!isStructuralEditingActive) {
      setKonfiguration(einheit?.lernpfade_konfiguration || DEFAULT_KONFIG);
    }
  }, [einheit?.lernpfade_konfiguration, isStructuralEditingActive]);

  // ── Sync-Hook (debounced Save + Junction-Sync + Toasts) ─────────────
  const { saveState, scheduleSave, flushSave, hasPending } = useDashboardSync({
    einheitId: einheit?.id,
    isStructuralEditingActive,
  });

  const updateKonfiguration = useCallback(
    (updater) => {
      setKonfiguration((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

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

  // ── DnD-Hook ────────────────────────────────────────────────────────
  const { handleDragEnd } = useDashboardDragAndDrop({
    activeLernTyp,
    readOnly,
    usedAufgabenIds,
    updateKonfiguration,
  });

  // ── Sektor-Handler ──────────────────────────────────────────────────
  const handleAddSektor = useCallback(() => {
    if (readOnly) return;
    updateKonfiguration((prev) => addSektor(prev, activeLernTyp, createNewSektor()));
  }, [readOnly, activeLernTyp, updateKonfiguration]);

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
      <DragDropContext onDragEnd={handleDragEnd}>
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

      <DidaktischerGuidePanel
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        lerntyp={activeLernTyp}
        isLocked={istPfadGesperrt}
        onApplyClick={handleApplyTemplate}
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