/**
 * useLernpfadDriftReport.js
 *
 * Phase E.4 — UI-Layer für den Drift-Report einer Einheit.
 *
 * Verantwortung:
 *   - Initial-Load via Backend-Function `getLernpfadDriftReport`
 *     (read-only, kein Sync-Side-Effect).
 *   - Möglichkeit, den Report nach einem erfolgreichen Save manuell
 *     zu refreshen (`refresh`). Wir nehmen bewusst KEIN automatisches
 *     React-Query-Polling, weil `useDashboardSync` ohnehin nach jedem
 *     Save `syncLernpfadMembership` aufruft und dort den Report bereits
 *     mitberechnet — wir reichen ihn von dort einfach durch (siehe
 *     `applyDriftReport`).
 *
 * Rückgabe:
 *   {
 *     driftReport,      // { [lerntyp]: { [sektor_id]: 'clean'|'drifted'|'never_locked' } } | null
 *     isLoading,        // true während des Initial-Loads
 *     refresh,          // () => Promise<void>  – manueller Re-Fetch
 *     applyDriftReport, // (report) => void     – setzt Report direkt
 *     getStatus,        // (lerntyp, sektor_id) => 'clean'|'drifted'|'never_locked'|'unknown'
 *   }
 *
 * 'unknown' wird zurückgegeben, solange der Report noch nicht geladen
 * wurde — das UI rendert dann ein dezentes Loading-Indicator-Badge.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useLernpfadDriftReport(einheitId) {
  const [driftReport, setDriftReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // In-Flight-Schutz, damit gleichzeitige refresh-Aufrufe (z. B. nach
  // mehreren schnellen Saves hintereinander) sich nicht doppeln.
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!einheitId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const res = await base44.functions.invoke('getLernpfadDriftReport', { einheitId });
      const report = res?.data?.drift_report || null;
      setDriftReport(report);
    } catch (err) {
      // Drift-Report ist diagnostisch — bei Fehler nicht laut werden,
      // sondern stillschweigend ohne Badges weiterlaufen.
      console.warn('[useLernpfadDriftReport] Fehler beim Laden:', err);
      setDriftReport(null);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [einheitId]);

  // Initial-Load bei Einheit-Wechsel.
  useEffect(() => {
    if (!einheitId) {
      setDriftReport(null);
      return;
    }
    refresh();
  }, [einheitId, refresh]);

  // Direkt-Setter für Reports, die `useDashboardSync` aus der
  // syncLernpfadMembership-Response bekommt — vermeidet einen
  // Extra-Roundtrip nach jedem Save.
  const applyDriftReport = useCallback((report) => {
    if (report && typeof report === 'object') {
      setDriftReport(report);
    }
  }, []);

  const getStatus = useCallback(
    (lerntyp, sektorId) => {
      if (!driftReport) return 'unknown';
      const lt = driftReport?.[lerntyp];
      if (!lt) return 'unknown';
      return lt?.[sektorId] || 'unknown';
    },
    [driftReport]
  );

  return { driftReport, isLoading, refresh, applyDriftReport, getStatus };
}