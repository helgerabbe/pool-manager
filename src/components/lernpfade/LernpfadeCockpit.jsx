/**
 * LernpfadeCockpit.jsx
 *
 * Hauptkomponente für Tab 7 "Dashboards" (Lernpfad-Architekt).
 * Verantwortlich für:
 *   - Strukturelle Lese-/Schreibsperre (recycelt structural_lock der Einheit).
 *   - Halten des lernpfade_konfiguration-State (lokal, debounced gespiegelt nach Backend).
 *   - Layout: 30% Pool (links) + 70% Architekt (rechts).
 *
 * Persistenz-Modell:
 *   - Beim Mount: Snapshot aus einheit.lernpfade_konfiguration laden.
 *   - Bei Änderung: lokal State aktualisieren, Backend-Save mit 800ms Debounce.
 *   - Bei Unmount/Lock-Verlust: pending Save sofort flushen.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock, PenLine, Unlock, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import LernpfadeAufgabenPool from '@/components/lernpfade/LernpfadeAufgabenPool';
import LernpfadeArchitekt from '@/components/lernpfade/LernpfadeArchitekt';
import { getUsedAufgabenIds } from '@/lib/lernpfadeUtils';

const DEFAULT_KONFIG = { minimalist: [], pragmatiker: [], ehrgeizig: [], passioniert: [] };
const DEBOUNCE_MS = 800;

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
  // ── State ───────────────────────────────────────────────────────────
  const [konfiguration, setKonfiguration] = useState(
    () => einheit?.lernpfade_konfiguration || DEFAULT_KONFIG
  );
  const [activeLernTyp, setActiveLernTyp] = useState('pragmatiker');
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'pending' | 'saving' | 'saved' | 'error'

  // Re-Sync, wenn der Einheit-Snapshot sich ändert (z.B. nach Tab-Wechsel)
  // ABER NUR im Lesemodus – im Edit-Modus ist der lokale State führend.
  useEffect(() => {
    if (!isStructuralEditingActive) {
      setKonfiguration(einheit?.lernpfade_konfiguration || DEFAULT_KONFIG);
    }
  }, [einheit?.lernpfade_konfiguration, isStructuralEditingActive]);

  // ── Debounced Save ─────────────────────────────────────────────────
  const debounceTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  const flushSave = useCallback(async () => {
    if (!einheit?.id || !pendingPayloadRef.current) return;
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    setSaveState('saving');
    try {
      await base44.entities.Einheiten.update(einheit.id, { lernpfade_konfiguration: payload });
      setSaveState('saved');
      // Nach 1.5s zurück auf 'idle' – nur visuelles Feedback.
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (err) {
      setSaveState('error');
      toast.error('Lernpfad-Konfiguration konnte nicht gespeichert werden.');
      console.error('[LernpfadeCockpit] Save-Fehler:', err);
    }
  }, [einheit?.id]);

  const scheduleSave = useCallback(
    (next) => {
      pendingPayloadRef.current = next;
      setSaveState('pending');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        flushSave();
      }, DEBOUNCE_MS);
    },
    [flushSave]
  );

  // Beim Unmount: pending save flushen, Timer säubern.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (pendingPayloadRef.current) {
        flushSave();
      }
    };
  }, [flushSave]);

  // Wenn der Lock verloren geht (kein Edit-Modus mehr): pending save flushen.
  useEffect(() => {
    if (!isStructuralEditingActive && pendingPayloadRef.current) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      flushSave();
    }
  }, [isStructuralEditingActive, flushSave]);

  // ── Update-API für die Architekt-Subkomponente ────────────────────
  // (Phase 3 wird sie via DnD aufrufen; aktuell noch ungenutzt – aber bereits angebunden.)
  // eslint-disable-next-line no-unused-vars
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

  // ── Render-Helfer ──────────────────────────────────────────────────
  const readOnly = !isStructuralEditingActive || isLockedByOther;

  // Set aller Aufgaben-IDs, die im aktuell aktiven Lerntyp bereits in einem Sektor stecken.
  // Wird an den Pool gereicht (visuelle Sperre) UND als Fallback im onDragEnd geprüft.
  const usedAufgabenIds = useMemo(
    () => getUsedAufgabenIds(konfiguration, activeLernTyp),
    [konfiguration, activeLernTyp]
  );

  // ── Drag & Drop ────────────────────────────────────────────────────
  // Phase 2-Update: Duplikat-Blockade.
  // Reorder/echtes Einfügen in Sektoren erfolgt in Phase 3 – hier wird der Drop derzeit nur validiert.
  const handleDragEnd = useCallback(
    (result) => {
      const { destination, draggableId, source } = result;
      // Kein Drop-Target → nichts zu tun.
      if (!destination) return;
      // Drop innerhalb des Pools (Quelle == Ziel) → ignorieren.
      if (destination.droppableId === 'pool') return;

      // Sicherheits-Fallback: Aufgabe schon im aktiven Pfad? → blocken.
      if (usedAufgabenIds.has(draggableId)) {
        toast.info('Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.');
        return;
      }

      // Phase 3: hier wird die Aufgabe in den Ziel-Sektor eingefügt
      // (über updateKonfiguration). Aktuell bewusst No-Op, damit Phase-2-Verhalten stabil bleibt.
      // eslint-disable-next-line no-unused-vars
      const _src = source;
    },
    [usedAufgabenIds]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top-Bar: Lock-Status + Save-Indicator */}
      <div className="shrink-0 px-4 py-2 border-b border-border bg-muted/40 flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground">Lernpfad-Architekt</h2>
        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          Phase 2 – Basis-Layout
        </span>

        {/* Save-Indicator */}
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

          {/* Lock-Steuerung */}
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

      {/* Layout: 30/70-Split – DragDropContext umschließt beide Spalten,
          damit Aufgaben aus dem Pool in die rechten Sektoren gezogen werden können. */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Pool (links, ca. 30%) */}
          <aside className="w-full lg:w-[30%] lg:min-w-[280px] lg:max-w-[420px] border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col overflow-hidden h-72 lg:h-auto shrink-0">
            <LernpfadeAufgabenPool
              einheitId={einheit?.id}
              usedAufgabenIds={usedAufgabenIds}
            />
          </aside>

          {/* Architekt (rechts, ca. 70%) */}
          <main className="flex-1 overflow-hidden min-h-0">
            <LernpfadeArchitekt
              konfiguration={konfiguration}
              activeLernTyp={activeLernTyp}
              onActiveLernTypChange={setActiveLernTyp}
              readOnly={readOnly}
            />
          </main>
        </div>
      </DragDropContext>
    </div>
  );
}