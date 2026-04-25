/**
 * useLernpfadStatus.js
 *
 * Liefert für eine (einheitId, lerntyp)-Kombination den aktuellen Pfad-Status:
 *   - PFAD_STATUS.LOCKED  → freigegeben/gesperrt
 *   - PFAD_STATUS.DRAFT   → editierbar
 *   - PFAD_STATUS.EMPTY   → noch keine Memberships vorhanden (z.B. leerer Pfad)
 *
 * Implementierung: Liest die LernpfadAufgabeMembership-Einträge dieser
 * Kombination und reduziert sie auf einen einzelnen Status.
 * Regel: sobald MIND. EIN Membership LOCKED ist, gilt der gesamte Pfad als
 * gesperrt. Das deckt sowohl den normalen Fall (alle gleich) als auch
 * potentielle Inkonsistenzen sicher ab.
 *
 * Status-Werte: siehe lib/pfadStatus.js (Single Source of Truth).
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { PFAD_STATUS } from '@/lib/pfadStatus';

// Re-Export für Backwards-Compat: Bestehende Imports `import { PFAD_STATUS }
// from '@/hooks/useLernpfadStatus'` funktionieren weiter, neue Aufrufer
// sollten direkt aus '@/lib/pfadStatus' importieren.
export { PFAD_STATUS };

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
      const hasLocked = list.some((m) => m.pfad_status === PFAD_STATUS.LOCKED);
      return {
        status: hasLocked ? PFAD_STATUS.LOCKED : PFAD_STATUS.DRAFT,
        count: list.length,
      };
    },
    enabled: !!einheitId && !!lerntyp,
    staleTime: 5 * 1000,
  });
}