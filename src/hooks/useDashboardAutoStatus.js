/**
 * useDashboardAutoStatus.js
 *
 * Auto-Assembly (Etappe 1): Verwaltet den Status pro Lerntyp-Dashboard
 * ('auto' = automatisch erstellt, noch nicht bestätigt | 'bestaetigt').
 * Persistiert in Einheiten.dashboards_auto_status.
 *
 * Siehe src/lib/dashboardAutoAssembly.js für das Status-Modell.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AUTO_DASHBOARD_STATUS } from '@/lib/dashboardAutoAssembly';

const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

export function useDashboardAutoStatus(einheit, toast) {
  const [autoStatusMap, setAutoStatusMap] = useState(
    () => einheit?.dashboards_auto_status || {}
  );
  useEffect(() => {
    setAutoStatusMap(einheit?.dashboards_auto_status || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [einheit?.id, einheit?.dashboards_auto_status]);

  const autoStatusRef = useRef(autoStatusMap);
  useEffect(() => {
    autoStatusRef.current = autoStatusMap;
  }, [autoStatusMap]);

  // Patch mergen + persistieren (fire-and-forget mit lokalem Optimismus).
  const persistAutoStatus = useCallback(
    (patch) => {
      if (!einheit?.id) return;
      const next = { ...(autoStatusRef.current || {}), ...patch };
      autoStatusRef.current = next;
      setAutoStatusMap(next);
      base44.entities.Einheiten.update(einheit.id, { dashboards_auto_status: next }).catch(
        (err) => {
          console.warn('[useDashboardAutoStatus] Speichern fehlgeschlagen:', err);
        }
      );
    },
    [einheit?.id]
  );

  // Nach einem Auto-Aufbau: Lerntyp als 'auto' markieren.
  const markLerntypAutoAssembled = useCallback(
    (lerntyp) => persistAutoStatus({ [lerntyp]: AUTO_DASHBOARD_STATUS.AUTO }),
    [persistAutoStatus]
  );

  // Dashboards als 'auto' markieren (Lazy-Init-Pfad). Ohne Argument alle
  // vier; mit Array nur die tatsächlich automatisch aufgebauten Lerntypen.
  const markAllAutoAssembled = useCallback(
    (lerntypen) => {
      const keys =
        Array.isArray(lerntypen) && lerntypen.length > 0 ? lerntypen : LERNTYP_KEYS;
      const patch = {};
      for (const lt of keys) {
        if (LERNTYP_KEYS.includes(lt)) patch[lt] = AUTO_DASHBOARD_STATUS.AUTO;
      }
      persistAutoStatus(patch);
    },
    [persistAutoStatus]
  );

  // Erster manueller Eingriff in ein 'auto'-Dashboard → 'bearbeitet'.
  // No-op für alle anderen Zustände und für Nicht-Lerntyp-Keys (Onboarding).
  const markLerntypBearbeitet = useCallback(
    (lerntyp) => {
      if (!LERNTYP_KEYS.includes(lerntyp)) return;
      if (autoStatusRef.current?.[lerntyp] !== AUTO_DASHBOARD_STATUS.AUTO) return;
      persistAutoStatus({ [lerntyp]: AUTO_DASHBOARD_STATUS.BEARBEITET });
    },
    [persistAutoStatus]
  );

  // Explizites „Übernehmen" durch die Fachschaftsleitung.
  const confirmAutoDashboard = useCallback(
    (lerntyp) => {
      if (autoStatusRef.current?.[lerntyp] !== AUTO_DASHBOARD_STATUS.AUTO) return;
      persistAutoStatus({ [lerntyp]: AUTO_DASHBOARD_STATUS.BESTAETIGT });
      toast?.({
        title: 'Dashboard übernommen',
        description: 'Der automatisch erstellte Aufbau gilt jetzt als bestätigt.',
      });
    },
    [persistAutoStatus, toast]
  );

  // Implizite Bestätigung über „Dashboard als geprüft markieren".
  const confirmIfAuto = useCallback(
    (lerntyp) => {
      if (autoStatusRef.current?.[lerntyp] === AUTO_DASHBOARD_STATUS.AUTO) {
        persistAutoStatus({ [lerntyp]: AUTO_DASHBOARD_STATUS.BESTAETIGT });
      }
    },
    [persistAutoStatus]
  );

  return {
    autoStatusMap,
    markLerntypAutoAssembled,
    markAllAutoAssembled,
    markLerntypBearbeitet,
    confirmAutoDashboard,
    confirmIfAuto,
  };
}