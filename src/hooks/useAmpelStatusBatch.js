/**
 * useAmpelStatusBatch.js
 *
 * Lädt EINMAL pro Tab-7-Öffnung die Datengrundlage für das Ampel-System:
 *   - Alle Aufgaben der Einheit (für flache + rekursive Prüfung).
 *   - Alle Lernpakete der Einheit (für Bündel-Rekursion).
 *
 * Vermeidet bewusst N+1: Sektor-Karten konsumieren das Ergebnis als Maps,
 * keine eigenen Queries pro Item.
 *
 * Hinweis: Die Aufgaben-Query teilt sich Cache & Key mit den anderen Tab-7-
 * Komponenten (`['allgemeineAufgaben', einheitId]`), sodass nach Edits eine
 * gemeinsame Invalidierung greift.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getAufgabenByEinheit } from '@/services/AllgemeineAufgabeService';

export function useAmpelStatusBatch(einheitId) {
  const { data: aufgaben = [], isLoading: aufgabenLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => (einheitId ? getAufgabenByEinheit(einheitId) : Promise.resolve([])),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [], isLoading: paketeLoading } = useQuery({
    queryKey: ['lernpakete-by-einheit', einheitId],
    queryFn: () =>
      einheitId
        ? base44.entities.Lernpakete.filter({ einheit_id: einheitId })
        : Promise.resolve([]),
    enabled: !!einheitId,
  });

  const aufgabenById = useMemo(() => {
    const map = new Map();
    (aufgaben || []).forEach((a) => map.set(a.id, a));
    return map;
  }, [aufgaben]);

  const lernpaketeById = useMemo(() => {
    const map = new Map();
    (lernpakete || []).forEach((p) => map.set(p.id, p));
    return map;
  }, [lernpakete]);

  return {
    aufgabenById,
    lernpaketeById,
    isLoading: aufgabenLoading || paketeLoading,
  };
}