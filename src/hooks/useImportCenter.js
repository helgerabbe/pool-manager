/**
 * hooks/useImportCenter.js
 *
 * Datenzugriff des Import-Centers. Lesen läuft direkt über die Entity bzw. die
 * beiden Lese-Funktionen, Schreiben ausschließlich über die geprüften
 * Backend-Funktionen — im Import-Center darf nichts an der Prüfung vorbei
 * in den Bestand gelangen.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const AUFTRAEGE_KEY = ['importAuftraege'];

export function useAuftragsSchemata() {
  return useQuery({
    queryKey: ['auftragsSchemata'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAuftragsSchemata', {});
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useImportAuftraege() {
  return useQuery({
    queryKey: AUFTRAEGE_KEY,
    queryFn: () => base44.entities.ImportAuftrag.list('-created_date', 200),
  });
}

export function useEinheitStruktur(einheitId, detailId = null) {
  return useQuery({
    queryKey: ['einheitStrukturLesend', einheitId, detailId],
    enabled: !!einheitId,
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitStrukturLesend', {
        einheit_id: einheitId,
        aktivitaet_detail_id: detailId || undefined,
      });
      return res.data;
    },
  });
}

export function useImportAuftragAktionen() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: AUFTRAEGE_KEY });

  const pruefen = useMutation({
    mutationFn: async (auftrag) => {
      const res = await base44.functions.invoke('pruefeImportAuftrag', auftrag);
      return res.data;
    },
    onSuccess: (data) => {
      refresh();
      if (data?.ausfuehrbar) toast.success('Auftrag geprüft — er kann durchgeführt werden.');
      else toast.warning(`Auftrag geprüft — ${data?.pruefergebnis?.length || 0} Punkt(e) fehlen noch.`);
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message),
  });

  const ausfuehren = useMutation({
    mutationFn: async (auftragId) => {
      const res = await base44.functions.invoke('fuehreImportAuftragAus', { auftrag_id: auftragId });
      return res.data;
    },
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['einheitStrukturLesend'] });
      toast.success('Auftrag durchgeführt.');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message),
  });

  const entscheiden = useMutation({
    mutationFn: async ({ auftragId, entscheidung, begruendung }) => {
      const res = await base44.functions.invoke('importAuftragEntscheiden', {
        auftrag_id: auftragId,
        entscheidung,
        begruendung,
      });
      return res.data;
    },
    onSuccess: (_d, vars) => {
      refresh();
      toast.success(vars.entscheidung === 'abgelehnt' ? 'Auftrag abgelehnt.' : 'Auftrag wieder geöffnet.');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message),
  });

  return { pruefen, ausfuehren, entscheiden };
}