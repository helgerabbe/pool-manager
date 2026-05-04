/**
 * useEinheitExportLifecycle.js
 *
 * Phase C – schlanker Convenience-Hook für die UI-Sperrlogik in den
 * Arbeitsbereichen (Tabs 3–6) und in Status-Anzeigen (Tab 1/2 Info-Badge,
 * Einheitenliste).
 *
 * Single Source of Truth bleibt `useEinheitFreigabeStatus` – dieser Hook
 * liest nur dessen Ergebnis und liefert flache Booleans / Strings, die
 * das Workspace-Setup ohne Destructuring direkt verwenden kann.
 *
 * Rückgabe:
 *   {
 *     status,                // ExportLifecycleStatus
 *     isContentLocked,       // → Tabs 3/4/5/6 schalten read-only
 *     isVisuallyLocked,      // → Badges in Übersicht/Tab-1
 *     isFinal,               // status === FINAL_FREIGEGEBEN
 *     canUndoInUnit,         // 'Freigabe aufheben'-Button erlaubt?
 *     isLoading,
 *   }
 */

import { useEinheitFreigabeStatus } from '@/hooks/useEinheitFreigabeStatus';
import { EXPORT_LIFECYCLE_STATUS } from '@/lib/exportLifecycle';

export function useEinheitExportLifecycle(einheitId) {
  const { data, isLoading } = useEinheitFreigabeStatus(einheitId);
  const status = data?.status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  return {
    status,
    isContentLocked: !!data?.isContentLocked,
    isVisuallyLocked: !!data?.isVisuallyLocked,
    isFinal: !!data?.isFinal,
    canUndoInUnit: !!data?.canUndoInUnit,
    isLoading,
  };
}

export default useEinheitExportLifecycle;