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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, PenLine, Unlock, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LernpfadeAufgabenPool from '@/components/lernpfade/LernpfadeAufgabenPool';
import LernpfadeArchitekt, { LERN_TYPEN } from '@/components/lernpfade/LernpfadeArchitekt';
import LernpfadeQuickAddModal from '@/components/lernpfade/LernpfadeQuickAddModal';
import AufgabePreviewDialog from '@/components/lernpfade/AufgabePreviewDialog';
import ReleaseBlockerModal from '@/components/lernpfade/ReleaseBlockerModal';
import DidaktischerGuidePanel from '@/components/lernpfade/DidaktischerGuidePanel';
import CockpitActionToolbar from '@/components/lernpfade/CockpitActionToolbar';
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
  insertAufgabeInSektor,
  removeAufgabeFromLernTyp,
  copySektorenBetweenLernTypen,
} from '@/lib/lernpfadeUtils';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';
import { getAmpelStatus } from '@/lib/ampelLogic';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';

const DEFAULT_KONFIG = { minimalist: [], pragmatiker: [], ehrgeizig: [], passioniert: [] };

export default function LernpfadeCockpit({
  einheit,
  isStructuralEditingActive,
  isLockedByOther,
  acquiringStructLock,
  releasingStructLock,
  onAcquireLock,
  onReleaseLock,
  kannBearbeiten,
}) {
  const queryClient = useQueryClient();

  // ── State ───────────────────────────────────────────────────────────
  const [konfiguration, setKonfiguration] = useState(
    () => einheit?.lernpfade_konfiguration || DEFAULT_KONFIG
  );
  const [activeLernTyp, setActiveLernTyp] = useState('pragmatiker');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
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

  const handleCopyFromLernTyp = useCallback(
    (sourceLernTyp) => {
      if (readOnly || !sourceLernTyp || sourceLernTyp === activeLernTyp) return;
      const sourceCount = (konfiguration?.[sourceLernTyp] || []).length;
      if (sourceCount === 0) return;
      const targetCount = (konfiguration?.[activeLernTyp] || []).length;
      if (targetCount > 0) {
        const ok = window.confirm(
          `Aktuelle Struktur (${targetCount} Sektor${targetCount === 1 ? '' : 'en'}) wird durch ${sourceCount} Sektor${sourceCount === 1 ? '' : 'en'} ersetzt. Fortfahren?`
        );
        if (!ok) return;
      }
      updateKonfiguration((prev) => copySektorenBetweenLernTypen(prev, sourceLernTyp, activeLernTyp));
      setSelectedAufgabeId(null);
    },
    [readOnly, activeLernTyp, konfiguration, updateKonfiguration, setSelectedAufgabeId]
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

  // ── Quick-Add ──────────────────────────────────────────────────────
  const handleQuickAddCreated = useCallback(
    (created) => {
      if (!created?.id) return;
      updateKonfiguration((prev) => {
        const sektoren = prev?.[activeLernTyp] || [];
        if (sektoren.length === 0) {
          const sek = createNewSektor();
          const withSektor = addSektor(prev, activeLernTyp, sek);
          return insertAufgabeInSektor(withSektor, activeLernTyp, sek.sektor_id, created.id, undefined);
        }
        const lastSektor = sektoren[sektoren.length - 1];
        return insertAufgabeInSektor(prev, activeLernTyp, lastSektor.sektor_id, created.id, undefined);
      });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben', einheit?.id] });
    },
    [activeLernTyp, updateKonfiguration, queryClient, einheit?.id]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top-Bar: Save-Indicator + Strukturlock-Steuerung */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/40 flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">Lernpfad-Architekt</h2>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          Phase 4 – Vorschau &amp; Kopie
        </span>

        <div className="ml-auto flex items-center gap-2">
          {saveState === 'pending' && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Änderung registriert…
            </span>
          )}
          {saveState === 'saving' && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Speichere…
            </span>
          )}
          {saveState === 'saved' && (
            <span className="text-[11px] text-emerald-700 flex items-center gap-1">
              <Cloud className="w-3 h-3" /> Gespeichert
            </span>
          )}
          {saveState === 'error' && (
            <span className="text-[11px] text-destructive flex items-center gap-1">
              <CloudOff className="w-3 h-3" /> Fehler
            </span>
          )}

          {kannBearbeiten && !isLockedByOther && (
            isStructuralEditingActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onReleaseLock}
                disabled={releasingStructLock}
                className="gap-1.5 h-7 text-xs"
              >
                {releasingStructLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                Bearbeitung beenden
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onAcquireLock}
                disabled={acquiringStructLock}
                className="gap-1.5 h-7 text-xs"
              >
                {acquiringStructLock ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                Bearbeiten starten
              </Button>
            )
          )}

          {isLockedByOther && (
            <span className="text-[11px] text-orange-700 flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              <Lock className="w-3 h-3" /> Gesperrt von {einheit?.structural_lock}
            </span>
          )}
        </div>
      </div>

      {/* Aktionsleiste: Guide-Trigger, Status-Badge, Freigabe/Entsperren */}
      <CockpitActionToolbar
        lerntypLabel={lerntypLabel}
        istPfadGesperrt={istPfadGesperrt}
        darfFreigeben={darfFreigeben}
        darfEntsperren={darfEntsperren}
        statusBusy={statusBusy}
        isStructuralEditingActive={isStructuralEditingActive}
        isLockedByOther={isLockedByOther}
        onOpenGuide={() => setIsGuideOpen(true)}
        onReleasePath={handleReleasePath}
        onUnlockPath={handleUnlockPath}
      />

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
              onQuickAddOpen={() => setQuickAddOpen(true)}
              onSelectAufgabe={setSelectedAufgabeId}
              onSelectSystemBaustein={setSelectedSystemBausteinId}
              selectedAufgabeId={selectedAufgabeId}
              selectedSystemBausteinId={selectedSystemBausteinId}
              onCopyFromLernTyp={handleCopyFromLernTyp}
              getAmpelStatusForItem={getAmpelStatusForItem}
              onOpenAufgabeEditor={handleOpenAufgabeEditor}
            />
          </main>
        </div>
      </DragDropContext>

      <LernpfadeQuickAddModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        einheitId={einheit?.id}
        onCreated={handleQuickAddCreated}
      />

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