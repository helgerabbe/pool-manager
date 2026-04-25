/**
 * useLernpfadStatus.js
 *
 * Liefert für eine (einheitId, lerntyp)-Kombination den aktuellen Pfad-Status:
 *   - 'locked_for_export'  → freigegeben/gesperrt
 *   - 'draft'              → editierbar
 *   - 'empty'              → noch keine Memberships vorhanden (z.B. leerer Pfad)
 *
 * Implementierung: Liest die LernpfadAufgabeMembership-Einträge dieser
 * Kombination und reduziert sie auf einen einzelnen Status.
 * Regel: sobald MIND. EIN Membership 'locked_for_export' ist, gilt der
 * gesamte Pfad als gesperrt. Das deckt sowohl den normalen Fall (alle gleich)
 * als auch potentielle Inkonsistenzen sicher ab.
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export const PFAD_STATUS = Object.freeze({
  LOCKED: 'locked_for_export',
  DRAFT: 'draft',
  EMPTY: 'empty',
});

export function useLernpfadStatus(einheitId, lerntyp) {
  return useQuery({
    queryKey: ['lernpfadStatus', einheitId, lerntyp],
    queryFn: async () => {
      if (!einheitId || !lerntyp) return { status: PFAD_STATUS.EMPTY, count: 0 };
      const list = await base44.entities.LernpfadAufgabeMembership.filter({
        einheit_id: einheitId,
        lerntyp,
      });
      if (!list || list.length === 0) {
        return { status: PFAD_STATUS.EMPTY, count: 0 };
      }
      const hasLocked = list.some((m) => m.pfad_status === 'locked_for_export');
      return {
        status: hasLocked ? PFAD_STATUS.LOCKED : PFAD_STATUS.DRAFT,
        count: list.length,
      };
    },
    enabled: !!einheitId && !!lerntyp,
    staleTime: 5 * 1000,
  });
}