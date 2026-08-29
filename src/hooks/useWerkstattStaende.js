import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useWerkstattStaende
 * ───────────────────
 * Die Zwischenstände eines offenen Schritts, dauerhaft gespeichert.
 *
 * Ohne das lebten die Stände nur in der Sitzung: Werkstatt zu, frühere
 * Fassungen weg. Für „Zurückspringen auf frühere Stände" reicht das nicht,
 * weil eine Lehrkraft eine Aufgabe selten in einem Zug fertig baut.
 *
 * Gehalten wird je Schritt nur eine begrenzte Zahl von Ständen — ein
 * Fragment ist schnell einige Kilobyte groß, und der zwölftletzte Versuch
 * interessiert niemanden mehr. Beim Anlegen werden ältere weggeräumt.
 *
 * Ohne `aufgabeId` (die Aufgabe wurde noch nie gespeichert) passiert nichts.
 * Die Werkstatt fällt dann auf den Sitzungsspeicher zurück und sagt das auch.
 */

const MAX_STAENDE = 15;

export default function useWerkstattStaende({ aufgabeId, schrittId } = {}) {
  const queryClient = useQueryClient();
  const aktiv = !!aufgabeId && !!schrittId;
  const queryKey = ['werkstattStaende', aufgabeId, schrittId];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: aktiv,
    queryFn: async () => {
      const rows = await base44.entities.AufgabeWerkstattStand.filter({
        aufgabe_id: aufgabeId,
        schritt_id: schrittId,
      });
      return [...(rows || [])].sort((a, b) => (a.nummer || 0) - (b.nummer || 0));
    },
    staleTime: 30 * 1000,
  });

  const staende = data || [];

  /**
   * Legt einen neuen Stand an und räumt alte weg.
   *
   * Fehler werden bewusst nur gemeldet, nicht geworfen: Ein misslungener
   * Verlaufseintrag darf das Gespräch nicht abbrechen — die Lehrkraft
   * arbeitet weiter, sie hat dann nur einen Stand weniger im Verlauf.
   */
  const hinzufuegen = useCallback(async (fragment, { anlass = '' } = {}) => {
    if (!aktiv || !fragment?.trim()) return null;
    try {
      const vorhandene = await base44.entities.AufgabeWerkstattStand.filter({
        aufgabe_id: aufgabeId,
        schritt_id: schrittId,
      });
      const sortiert = [...(vorhandene || [])].sort((a, b) => (a.nummer || 0) - (b.nummer || 0));
      const nummer = (sortiert[sortiert.length - 1]?.nummer || 0) + 1;

      const neu = await base44.entities.AufgabeWerkstattStand.create({
        aufgabe_id: aufgabeId,
        schritt_id: schrittId,
        nummer,
        label: nummer === 1 ? 'Erste Fassung' : `Stand ${nummer}`,
        fragment,
        anlass: String(anlass || '').slice(0, 200),
        uebernommen: false,
      });

      // Überzählige alte Stände entfernen — ältester zuerst.
      const zuViel = sortiert.length + 1 - MAX_STAENDE;
      if (zuViel > 0) {
        await Promise.all(
          sortiert.slice(0, zuViel).map((s) =>
            base44.entities.AufgabeWerkstattStand.delete(s.id).catch(() => null)),
        );
      }

      queryClient.invalidateQueries({ queryKey });
      return neu;
    } catch (_e) {
      return null;
    }
  }, [aktiv, aufgabeId, schrittId, queryClient]);

  /** Markiert genau einen Stand als den übernommenen. */
  const alsUebernommenMarkieren = useCallback(async (standId) => {
    if (!aktiv || !standId) return;
    try {
      await Promise.all(staende.map((s) => (
        s.uebernommen === (s.id === standId)
          ? null
          : base44.entities.AufgabeWerkstattStand.update(s.id, { uebernommen: s.id === standId })
      )).filter(Boolean));
      queryClient.invalidateQueries({ queryKey });
    } catch (_e) { /* Verlaufsmarkierung ist nicht kritisch */ }
  }, [aktiv, staende, queryClient]);

  return { staende, isLoading, hinzufuegen, alsUebernommenMarkieren, aktiv };
}
