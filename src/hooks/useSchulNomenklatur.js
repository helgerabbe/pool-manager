/**
 * useSchulNomenklatur.js
 *
 * Lädt alle SchulNomenklatur-Records und stellt eine Save-Mutation zur
 * Verfügung, die über die Backend-Function `updateSchulNomenklaturSecure`
 * läuft (RLS auf der Entity ist admin-only, der Wrapper erlaubt zusätzlich
 * die zuständige Fachschaftsleitung).
 *
 * Read-Cache-Key: ['schulNomenklatur'] — wird auch im
 * MBK-Compiler / im Hash-Helper als Quelle verwendet, sobald wir den
 * Hash in den C-Global-Payload einbauen (separater Schritt).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const QUERY_KEY = ['schulNomenklatur'];

export function useSchulNomenklatur() {
  const queryClient = useQueryClient();

  const { data: records = [], isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => base44.entities.SchulNomenklatur.list('-updated_date', 200),
    staleTime: 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await base44.functions.invoke('updateSchulNomenklaturSecure', payload);
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const getByFach = (fach) => records.find((r) => r.fach === fach) || null;

  return {
    records,
    isLoading,
    isError,
    isSaving: saveMutation.isPending,
    save: saveMutation.mutateAsync,
    getByFach,
  };
}