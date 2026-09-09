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
  const [antwortLaeuft, setAntwortLaeuft] = useState(false);
  const [brianLaeuft, setBrianLaeuft] = useState(false);

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

  /** Entscheidungen als Antwortdatei ins Repository schreiben (Rückweg). */
  const antwortSenden = useCallback(
    async (hinweis) => {
      if (!einheitId || antwortLaeuft) return;
      setAntwortLaeuft(true);
      try {
        const res = await invokeFunction('pushMbkAntwort', {
          einheit_id: einheitId,
          hinweis: hinweis || '',
          neu_bauen: true,
        });
        const d = res.data || {};
        await neuLaden();
        toast.success(
          `${d.gesendet || 0} Entscheidungen zurückgemeldet — das Moodle-Team weiß jetzt, dass gebaut werden kann.`
        );
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Die Antwort konnte nicht gesendet werden.');
      } finally {
        setAntwortLaeuft(false);
      }
    },
    [einheitId, antwortLaeuft, neuLaden]
  );

  /** Brian-Adressen aus dem Austauschordner holen und in die Aufgaben eintragen. */
  const brianAdressenHolen = useCallback(async () => {
    if (!einheitId || brianLaeuft) return;
    setBrianLaeuft(true);
    try {
      const res = await invokeFunction('pullBrianUrls', { einheit_id: einheitId });
      const d = res.data || {};
      if (!d.gefunden) {
        toast.info(d.hinweis || 'Es liegen noch keine Brian-Adressen bereit.');
      } else {
        await queryClient.invalidateQueries({ queryKey: ['workspaceEinheitData', einheitId] });
        toast.success(
          d.uebernommen > 0
            ? `${d.uebernommen} Brian-Adressen übernommen.`
            : 'Alle bekannten Brian-Adressen sind schon eingetragen.'
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Die Brian-Adressen konnten nicht geholt werden.');
    } finally {
      setBrianLaeuft(false);
    }
  }, [einheitId, brianLaeuft, queryClient]);

  return {
    abholen,
    abholenLaeuft,
    dublettenPruefen,
    dublettenLaeuft,
    antwortSenden,
    antwortLaeuft,
    brianAdressenHolen,
    brianLaeuft,
  };
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