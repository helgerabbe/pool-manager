import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const fehlerText = (err) => err?.response?.data?.error || err?.message || 'Etwas ist schiefgelaufen.';

/** Planung (Struktur) einer Unterrichtseinheit: laden, speichern, KI-Schritte. */
export function useUnterrichtsPlanung(ueId, email) {
  const qc = useQueryClient();
  const key = ['unterrichtsplanung', ueId];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => (await base44.entities.UnterrichtsPlanung.filter({ unterrichtseinheit_id: ueId, besitzer_email: email }))[0] || null,
    enabled: !!ueId && !!email,
  });
  const neuLaden = () => qc.invalidateQueries({ queryKey: key });

  const speichern = useMutation({
    mutationFn: (daten) => (query.data
      ? base44.entities.UnterrichtsPlanung.update(query.data.id, daten)
      : base44.entities.UnterrichtsPlanung.create({ unterrichtseinheit_id: ueId, besitzer_email: email, ...daten })),
    onSuccess: (p) => qc.setQueryData(key, p),
    onError: (e) => toast.error(fehlerText(e)),
  });

  const ki = (name) => ({
    mutationFn: async (payload) => (await base44.functions.invoke(name, payload)).data,
    onSuccess: neuLaden,
    onError: (e) => toast.error(fehlerText(e)),
  });
  const recherche = useMutation(ki('unterrichtInhalteRecherche'));
  const planen = useMutation(ki('unterrichtVerlaufPlanen'));

  return { planung: query.data, isLoading: query.isLoading, speichern, recherche, planen };
}