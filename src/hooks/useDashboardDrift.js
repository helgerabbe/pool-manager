/**
 * useDashboardDrift.js
 *
 * Memoizierter Wrapper um `detectDashboardDrift`. Gibt den DriftReport für
 * eine bestimmte Konfiguration + Strukturdaten zurück, ohne den Detector
 * bei jedem Render neu auszuführen.
 *
 * Bewusst frei von React-Query — die Strukturdaten (themenfelder,
 * aufgaben, lernpakete) liegen ohnehin schon im Cockpit vor und werden
 * hier nur als Argument durchgereicht.
 */

import { useMemo } from 'react';
import { detectDashboardDrift } from '@/lib/dashboardDriftDetector';

export function useDashboardDrift({
  konfiguration,
  themenfelder,
  aufgaben,
  lernpakete,
} = {}) {
  return useMemo(
    () =>
      detectDashboardDrift({
        konfiguration,
        themenfelder,
        aufgaben,
        lernpakete,
      }),
    [konfiguration, themenfelder, aufgaben, lernpakete]
  );
}