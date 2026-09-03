/**
 * usePruefung
 *
 * Steuert einen Prüflauf der Export-Vorprüfung (Prüfbereich, Tab 8) vom
 * Frontend aus: starten, Schritte einzeln abarbeiten (dadurch echter
 * Fortschritt statt Wartebalken ins Blaue), abschließen. Die Befunde selbst
 * kommen aus der Pruefbefund-Entity und werden nach jedem Lauf neu geladen.
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { invokeFunction } from '@/utils/functionsHelper';
import { toast } from 'sonner';

export function usePruefbefunde(einheitId) {
  return useQuery({
    queryKey: ['pruefbefunde', einheitId],
    queryFn: () => base44.entities.Pruefbefund.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });
}

export function usePruefungLauf(einheitId) {
  const queryClient = useQueryClient();
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState(null); // { erledigt, gesamt, schritt }

  const starten = useCallback(async ({ mitKI = false } = {}) => {
    if (!einheitId || laeuft) return;
    setLaeuft(true);
    setFortschritt({ erledigt: 0, gesamt: 1, schritt: 'Prüfung wird vorbereitet …' });
    try {
      const res = await invokeFunction('pruefungStarten', {
        einheit_id: einheitId,
        stufen: mitKI ? ['regel', 'ki'] : ['regel'],
      });
      const { prueflauf_id, schritte = [] } = res.data || {};
      setFortschritt({ erledigt: 0, gesamt: schritte.length || 1, schritt: 'Start …' });

      for (let i = 0; i < schritte.length; i += 1) {
        const s = schritte[i];
        setFortschritt({ erledigt: i, gesamt: schritte.length, schritt: s.titel });
        await invokeFunction('pruefungSchritt', { prueflauf_id, schritt: s });
      }

      setFortschritt({ erledigt: schritte.length, gesamt: schritte.length, schritt: 'Ergebnis wird zusammengestellt …' });
      const abschluss = await invokeFunction('pruefungAbschliessen', { prueflauf_id });
      await queryClient.invalidateQueries({ queryKey: ['pruefbefunde', einheitId] });
      const offen = abschluss.data?.anzahl_offen ?? 0;
      toast.success(offen === 0 ? 'Prüfung fertig – keine offenen Befunde.' : `Prüfung fertig – ${offen} offene Befunde.`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Die Prüfung konnte nicht abgeschlossen werden.');
    } finally {
      setLaeuft(false);
      setFortschritt(null);
    }
  }, [einheitId, laeuft, queryClient]);

  const entscheiden = useCallback(
    async ({ befundId, entscheidung, kommentar }) => {
      try {
        await invokeFunction('pruefungBefundEntscheiden', {
          befund_id: befundId,
          entscheidung,
          kommentar: kommentar || '',
        });
        await queryClient.invalidateQueries({ queryKey: ['pruefbefunde', einheitId] });
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Die Entscheidung konnte nicht gespeichert werden.');
      }
    },
    [einheitId, queryClient]
  );

  return { laeuft, fortschritt, starten, entscheiden };
}