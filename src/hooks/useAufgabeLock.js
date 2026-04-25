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
    // Kurze Cache-Zeit, damit das Schließen/Öffnen des Editors einen frischen Stand zeigt.
    staleTime: 10_000,
  });
}