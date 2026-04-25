/**
 * useDashboardSync.js
 *
 * Persistenz-Layer für die `lernpfade_konfiguration` einer Einheit.
 *
 * Verantwortung:
 *   - Debounced Backend-Write (Default: 800 ms).
 *   - Hard-Flush bei Unmount oder Verlust des Strukturlocks.
 *   - Idempotenter Aufruf von `syncLernpfadMembership` nach jedem erfolgreichen
 *     Save → hält die Junction-Table konsistent + invalidiert Aufgaben-Lock-Cache.
 *   - UI-Feedback über Toasts (Save-Fehler hart, Junction-Sync-Fehler weich).
 *
 * Was er NICHT macht: Den Konfigurations-State selbst halten. Der bleibt in
 * der Cockpit-Komponente (Single Source of Truth), wir bekommen ihn nur
 * über `scheduleSave(next)` zum Persistieren gereicht.
 *
 * Rückgabe:
 *   {
 *     saveState,    // 'idle' | 'pending' | 'saving' | 'saved' | 'error'
 *     scheduleSave, // (nextKonfig) => void   – zum Auslösen eines debounced Save
 *     flushSave,    // () => Promise<void>    – ausstehenden Save sofort schreiben
 *     hasPending,   // () => boolean          – gibt es einen ungeschriebenen Save?
 *   }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DEFAULT_DEBOUNCE_MS = 800;

export function useDashboardSync({ einheitId, isStructuralEditingActive, debounceMs = DEFAULT_DEBOUNCE_MS }) {
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState('idle');

  const debounceTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  const flushSave = useCallback(async () => {
    if (!einheitId || !pendingPayloadRef.current) return;
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    setSaveState('saving');
    try {
      await base44.entities.Einheiten.update(einheitId, { lernpfade_konfiguration: payload });
      // Junction-Table synchron halten (idempotent).
      // Wenn der Sync fehlschlägt, ist das KEIN Save-Fehler – die Konfiguration
      // selbst liegt schon korrekt in der DB. Wir warnen nur und cachen invalidieren.
      try {
        await base44.functions.invoke('syncLernpfadMembership', { einheitId });
        // Ampel- und Lock-Daten könnten sich geändert haben.
        // exact: false → invalidiert ALLE ['aufgabeLock', <id>]-Queries,
        // damit ein in einem anderen Tab offener Editor frisch lädt.
        queryClient.invalidateQueries({ queryKey: ['aufgabeLock'], exact: false });
      } catch (syncErr) {
        console.warn('[useDashboardSync] Membership-Sync fehlgeschlagen:', syncErr);
        toast.warning(
          'Echtzeit-Sync der Aufgaben-Sperre verzögert. Status in der Bearbeitungsansicht könnte abweichen.'
        );
      }
      setSaveState('saved');
      // Nach 1.5s zurück auf 'idle' – nur visuelles Feedback.
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (err) {
      setSaveState('error');
      toast.error('Lernpfad-Konfiguration konnte nicht gespeichert werden.');
      console.error('[useDashboardSync] Save-Fehler:', err);
    }
  }, [einheitId, queryClient]);

  const scheduleSave = useCallback(
    (next) => {
      pendingPayloadRef.current = next;
      setSaveState('pending');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        flushSave();
      }, debounceMs);
    },
    [flushSave, debounceMs]
  );

  const hasPending = useCallback(() => !!pendingPayloadRef.current, []);

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

  return { saveState, scheduleSave, flushSave, hasPending };
}