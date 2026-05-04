/**
 * useEinheitFreigabeStatus.js
 *
 * Single Source of Truth für den vierstufigen Export-Lifecycle einer Einheit
 * im Frontend.
 *
 * Liest den aktuellen `export_lifecycle_status` der Einheit (Phase A) und
 * berechnet zusätzlich, wie viele der 4 Lerntyp-Dashboards bereits geprüft
 * (locked_for_export) sind. Die abgeleiteten UI-Booleans
 * `isContentLocked` / `canUndoFreigabeInUnit` / `isVisuallyLocked` werden
 * direkt aus `lib/exportLifecycle.js` übernommen.
 *
 * Rückgabe (data):
 *   {
 *     status: ExportLifecycleStatus,
 *     changed_at: string|null,
 *     changed_by: string|null,
 *     dashboards: { minimalist, pragmatiker, ehrgeizig, passioniert: boolean },
 *     lockedCount: number,           // 0..4
 *     allDashboardsLocked: boolean,
 *     isFinal: boolean,              // status === FINAL_FREIGEGEBEN
 *     isContentLocked: boolean,      // Tabs 3/4/5/6 read-only?
 *     canUndoInUnit: boolean,        // 'Freigabe aufheben'-Button zeigen?
 *     isVisuallyLocked: boolean,     // Badge in Einheitenliste etc.?
 *   }
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  EXPORT_LIFECYCLE_STATUS,
  isContentLocked,
  isVisuallyLocked,
  canUndoFreigabeInUnit,
} from '@/lib/exportLifecycle';

// Legacy-Re-Export für Bestandscode (z. B. AufgabeCreateView, Block).
export const EINHEIT_FREIGABE_STATUS = Object.freeze({
  DRAFT: EXPORT_LIFECYCLE_STATUS.DRAFT,
  FINAL: EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN,
});

const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PFAD_LOCKED = 'locked_for_export';

export function useEinheitFreigabeStatus(einheitId) {
  return useQuery({
    queryKey: ['einheitFreigabeStatus', einheitId],
    queryFn: async () => {
      if (!einheitId) {
        const status = EXPORT_LIFECYCLE_STATUS.DRAFT;
        return {
          status,
          changed_at: null,
          changed_by: null,
          dashboards: { minimalist: false, pragmatiker: false, ehrgeizig: false, passioniert: false },
          lockedCount: 0,
          allDashboardsLocked: false,
          isFinal: false,
          isContentLocked: false,
          canUndoInUnit: false,
          isVisuallyLocked: false,
        };
      }
      const einheit = await base44.entities.Einheiten.get(einheitId);
      const memberships = await base44.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheitId,
      });
      const lockedSet = new Set(
        (memberships || []).filter((m) => m.pfad_status === PFAD_LOCKED).map((m) => m.lerntyp)
      );
      const dashboards = LERNTYPEN.reduce((acc, lt) => {
        acc[lt] = lockedSet.has(lt);
        return acc;
      }, {});
      const lockedCount = LERNTYPEN.reduce((n, lt) => n + (dashboards[lt] ? 1 : 0), 0);
      const status = einheit?.export_lifecycle_status || EXPORT_LIFECYCLE_STATUS.DRAFT;
      return {
        status,
        changed_at: einheit?.export_lifecycle_changed_at || null,
        changed_by: einheit?.export_lifecycle_changed_by || null,
        dashboards,
        lockedCount,
        allDashboardsLocked: lockedCount === 4,
        isFinal: status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN,
        isContentLocked: isContentLocked(status),
        canUndoInUnit: canUndoFreigabeInUnit(status),
        isVisuallyLocked: isVisuallyLocked(status),
      };
    },
    enabled: !!einheitId,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}