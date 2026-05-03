/**
 * useEinheitFreigabeStatus.js
 *
 * Schritt 3 des dreistufigen Freigabe-Workflows.
 *
 * Liefert für eine Einheit den finalen Freigabe-Status sowie eine Übersicht,
 * wie viele der vier Lerntyp-Dashboards bereits geprüft (locked_for_export)
 * sind. Wird oben im Architekt (Tab 7) als Status-Block angezeigt und vom
 * Final-Release-Button konsumiert.
 *
 * Rückgabe (data):
 *   {
 *     status: 'draft' | 'final_freigegeben',
 *     freigegeben_at: string | null,
 *     freigegeben_by: string | null,
 *     dashboards: { minimalist: boolean, pragmatiker: boolean, ehrgeizig: boolean, passioniert: boolean },
 *     lockedCount: number,   // 0..4
 *     allDashboardsLocked: boolean,
 *   }
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const EINHEIT_FREIGABE_STATUS = Object.freeze({
  DRAFT: 'draft',
  FINAL: 'final_freigegeben',
});

const LERNTYPEN = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];
const PFAD_LOCKED = 'locked_for_export';

export function useEinheitFreigabeStatus(einheitId) {
  return useQuery({
    queryKey: ['einheitFreigabeStatus', einheitId],
    queryFn: async () => {
      if (!einheitId) {
        return {
          status: EINHEIT_FREIGABE_STATUS.DRAFT,
          freigegeben_at: null,
          freigegeben_by: null,
          dashboards: { minimalist: false, pragmatiker: false, ehrgeizig: false, passioniert: false },
          lockedCount: 0,
          allDashboardsLocked: false,
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
      return {
        status: einheit?.einheit_freigabe_status || EINHEIT_FREIGABE_STATUS.DRAFT,
        freigegeben_at: einheit?.einheit_freigegeben_at || null,
        freigegeben_by: einheit?.einheit_freigegeben_by || null,
        dashboards,
        lockedCount,
        allDashboardsLocked: lockedCount === 4,
      };
    },
    enabled: !!einheitId,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
  });
}