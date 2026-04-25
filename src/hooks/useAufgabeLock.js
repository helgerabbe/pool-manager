/**
 * useAufgabeLock.js
 *
 * React-Query-Hook: liest den Lock-Status einer Aufgabe live aus der
 * Junction-Table LernpfadAufgabeMembership.
 *
 * Verwendung im AufgabeCreateView (Tab 5):
 *   const { data: lockInfo, isLoading } = useAufgabeLock(initialData?.id);
 *   if (lockInfo?.locked) → Read-Only-Modus + Warnung.
 */

import { useQuery } from '@tanstack/react-query';
import { isAufgabeLocked } from '@/lib/lernpfadLockUtils';

export function useAufgabeLock(aufgabeId) {
  return useQuery({
    queryKey: ['aufgabeLock', aufgabeId],
    queryFn: () => isAufgabeLocked(aufgabeId),
    enabled: !!aufgabeId,
    // staleTime: 0 + refetchOnWindowFocus: garantiert, dass nach einer
    // Pfad-Freigabe in Tab 7 (Cockpit) der Editor in Tab 5 beim nächsten
    // Fokus-Wechsel den frischen Lock-Status zieht. Andernfalls könnte ein
    // bereits offener Editor stale „nicht gelockt" anzeigen.
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}