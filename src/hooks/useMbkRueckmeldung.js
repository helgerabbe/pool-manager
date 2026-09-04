/**
 * useMbkRueckmeldung
 *
 * Datenzugriff und Aktionen für die Rückmeldung des Baus (MBK):
 * Befunde abholen, auf Dubletten prüfen, externe Punkte abhaken.
 *
 * Die MBK-Befunde liegen in derselben Entity wie die eigenen (Pruefbefund),
 * getrennt allein über `quelle='mbk'` — dadurch funktionieren Entscheidung,
 * Gruppierung und Payload-Weitergabe unverändert weiter.
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { invokeFunction } from '@/utils/functionsHelper';
import { toast } from 'sonner';

export function useMbkBefunde(einheitId) {
  return useQuery({
    queryKey: ['mbkBefunde', einheitId],
    queryFn: () => base44.entities.Pruefbefund.filter({ einheit_id: einheitId, quelle: 'mbk' }),
    enabled: !!einheitId,
  });
}

/** Ohne einheitId: alle offenen Punkte (Admin-Übersicht). */
export function useMbkAdminTodos(einheitId) {
  return useQuery({
    queryKey: ['mbkAdminTodos', einheitId || 'alle'],
    queryFn: () =>
      einheitId
        ? base44.entities.MbkAdminTodo.filter({ einheit_id: einheitId })
        : base44.entities.MbkAdminTodo.filter({ status: 'offen' }, '-gemeldet_am', 100),
  });
}

export function useMbkRueckmeldungAktionen(einheitId) {
  const queryClient = useQueryClient();
  const [abholenLaeuft, setAbholenLaeuft] = useState(false);
  const [dublettenLaeuft, setDublettenLaeuft] = useState(false);

  const neuLaden = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['mbkBefunde', einheitId] }),
      queryClient.invalidateQueries({ queryKey: ['pruefbefunde', einheitId] }),
      queryClient.invalidateQueries({ queryKey: ['mbkAdminTodos'] }),
    ]);
  }, [einheitId, queryClient]);

  const abholen = useCallback(async () => {
    if (!einheitId || abholenLaeuft) return;
    setAbholenLaeuft(true);
    try {
      const res = await invokeFunction('pullMbkRueckmeldung', { einheit_id: einheitId });
      const d = res.data || {};
      if (!d.gefunden) {
        toast.info(d.hinweis || 'Für diese Einheit liegt noch keine Rückmeldung vor.');
      } else {
        await neuLaden();
        const neu = d.befunde_neu || 0;
        const admin = d.admin_punkte_neu || 0;
        toast.success(
          neu === 0 && admin === 0
            ? 'Rückmeldung abgeholt – nichts Neues.'
            : `Rückmeldung abgeholt: ${neu} neue Befunde, ${admin} neue Punkte für die Administration.`
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Die Rückmeldung konnte nicht abgeholt werden.');
    } finally {
      setAbholenLaeuft(false);
    }
  }, [einheitId, abholenLaeuft, neuLaden]);

  const dublettenPruefen = useCallback(async () => {
    if (!einheitId || dublettenLaeuft) return;
    setDublettenLaeuft(true);
    try {
      const res = await invokeFunction('mbkDublettenPruefung', { einheit_id: einheitId });
      const d = res.data || {};
      await neuLaden();
      toast.success(
        d.geprueft === 0
          ? d.hinweis || 'Keine offenen MBK-Befunde zu prüfen.'
          : `${d.dubletten} von ${d.geprueft} Befunden sind bereits in der internen Liste.`
      );
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Die Dublettenprüfung ist fehlgeschlagen.');
    } finally {
      setDublettenLaeuft(false);
    }
  }, [einheitId, dublettenLaeuft, neuLaden]);

  return { abholen, abholenLaeuft, dublettenPruefen, dublettenLaeuft };
}

export function useMbkAdminTodoErledigen() {
  const queryClient = useQueryClient();
  return useCallback(
    async (todoId, status) => {
      try {
        await invokeFunction('mbkAdminTodoErledigen', { todo_id: todoId, status });
        await queryClient.invalidateQueries({ queryKey: ['mbkAdminTodos'] });
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Der Punkt konnte nicht geändert werden.');
      }
    },
    [queryClient]
  );
}