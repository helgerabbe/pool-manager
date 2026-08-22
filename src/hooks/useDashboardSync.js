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
 * ── VERBINDUNGSABBRUCH (Fix 2026-08-22) ────────────────────────────────────
 * Früher wurde die ausstehende Änderung VOR dem Netzwerk-Call verworfen. Ein
 * fehlgeschlagener Save (WLAN weg, Server nicht erreichbar) hat die Änderung
 * damit endgültig verloren – auch wenn die Verbindung Sekunden später wieder
 * da war. Jetzt gilt:
 *   - Die Nutzlast bleibt bis zum ERFOLG gemerkt.
 *   - Nach einem Fehler wird automatisch erneut versucht (5 s, dann 15 s …).
 *   - Kommt der Browser wieder online, wird sofort erneut geschrieben.
 *   - Solange etwas ungespeichert ist, warnt der Browser beim Schließen/
 *     Verlassen der Seite.
 * Ein späterer Erfolg überschreibt immer den vollständigen aktuellen Stand,
 * deshalb ist ein einfacher Retry sicher (kein Merge nötig).
 *
 * Rückgabe:
 *   {
 *     saveState,    // 'idle' | 'pending' | 'saving' | 'saved' | 'error'
 *     scheduleSave, // (nextKonfig) => void   – zum Auslösen eines debounced Save
 *     flushSave,    // (forcePayload?) => Promise<void> – sofort schreiben
 *     hasPending,   // () => boolean          – gibt es einen ungeschriebenen Save?
 *   }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DEFAULT_DEBOUNCE_MS = 800;
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000];

export function useDashboardSync({
  einheitId,
  isStructuralEditingActive,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  // Phase E.4: Optionaler Callback, dem wir den frischen drift_report aus
  // der `syncLernpfadMembership`-Response übergeben. Spart einen Extra-
  // Roundtrip auf `getLernpfadDriftReport` nach jedem Save.
  onDriftReport,
}) {
  const queryClient = useQueryClient();
  const [saveState, setSaveState] = useState('idle');
  // Aktuellen Callback in Ref halten, damit Änderungen den memoisierten
  // flushSave nicht neu erzeugen müssen.
  const onDriftReportRef = useRef(onDriftReport);
  useEffect(() => {
    onDriftReportRef.current = onDriftReport;
  }, [onDriftReport]);

  const debounceTimerRef = useRef(null);
  const pendingPayloadRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const inFlightRef = useRef(false);
  // Fehler-Toast nur einmal pro Ausfall zeigen, nicht bei jedem Retry.
  const errorNotifiedRef = useRef(false);

  const clearRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const flushSave = useCallback(async (forcePayload = null) => {
    if (!einheitId) return;
    if (forcePayload) pendingPayloadRef.current = forcePayload;
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    if (inFlightRef.current) return; // Ein Save läuft – der nimmt den neuesten Stand.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    clearRetry();
    inFlightRef.current = true;
    setSaveState('saving');
    try {
      await base44.entities.Einheiten.update(einheitId, { lernpfade_konfiguration: payload });
      // Erst nach bestätigtem Schreiben verwerfen – und nur, wenn in der
      // Zwischenzeit keine neuere Änderung dazugekommen ist.
      if (pendingPayloadRef.current === payload) pendingPayloadRef.current = null;
      retryAttemptRef.current = 0;
      errorNotifiedRef.current = false;

      // Junction-Table synchron halten (idempotent).
      // Wenn der Sync fehlschlägt, ist das KEIN Save-Fehler – die Konfiguration
      // selbst liegt schon korrekt in der DB. Wir warnen nur und cachen invalidieren.
      try {
        const syncRes = await base44.functions.invoke('syncLernpfadMembership', { einheitId });
        const driftReport = syncRes?.data?.drift_report;
        if (driftReport && onDriftReportRef.current) {
          onDriftReportRef.current(driftReport);
        }
        // Ampel- und Lock-Daten könnten sich geändert haben.
        queryClient.invalidateQueries({ queryKey: ['aufgabeLock'], exact: false });
      } catch (syncErr) {
        console.warn('[useDashboardSync] Membership-Sync fehlgeschlagen:', syncErr);
        toast.warning(
          'Echtzeit-Sync der Aufgaben-Sperre verzögert. Status in der Bearbeitungsansicht könnte abweichen.'
        );
      }

      inFlightRef.current = false;
      if (pendingPayloadRef.current) {
        // Während des Schreibens kam eine neuere Änderung → direkt nachziehen.
        setSaveState('pending');
        flushSave();
        return;
      }
      setSaveState('saved');
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500);
    } catch (err) {
      inFlightRef.current = false;
      setSaveState('error');
      console.error('[useDashboardSync] Save-Fehler:', err);
      if (!errorNotifiedRef.current) {
        errorNotifiedRef.current = true;
        toast.error(
          'Speichern nicht möglich – vermutlich keine Verbindung. Deine Änderungen bleiben erhalten und werden automatisch nachgeschickt. Bitte lass das Fenster geöffnet.',
          { duration: 8000 }
        );
      }
      // Automatischer Wiederholungsversuch mit zunehmendem Abstand.
      const delay =
        RETRY_DELAYS_MS[Math.min(retryAttemptRef.current, RETRY_DELAYS_MS.length - 1)];
      retryAttemptRef.current += 1;
      clearRetry();
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        flushSave();
      }, delay);
    }
  }, [einheitId, queryClient]);

  const scheduleSave = useCallback(
    (next) => {
      pendingPayloadRef.current = next;
      setSaveState('pending');
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        flushSave();
      }, debounceMs);
    },
    [flushSave, debounceMs]
  );

  const hasPending = useCallback(() => !!pendingPayloadRef.current, []);

  // Verbindung zurück → sofort erneut versuchen (statt auf den Retry zu warten).
  useEffect(() => {
    const onOnline = () => {
      if (pendingPayloadRef.current) flushSave();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushSave]);

  // Schutz vor stillem Datenverlust: Warnung beim Verlassen der Seite,
  // solange etwas ungespeichert ist.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!pendingPayloadRef.current) return undefined;
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Beim Unmount: pending save flushen, Timer säubern.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      clearRetry();
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