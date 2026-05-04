/**
 * useMBKGlobalPrompts.js
 *
 * Lädt + cached die globalen MBK-Prompts (Tab 2 im Export-Center).
 * Wird sowohl vom Manager-UI als auch vom Compiler in Tab 1 verwendet —
 * deshalb stabiler Query-Key und großzügige staleTime, damit beide
 * Stellen denselben Cache-Eintrag teilen.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export const MBK_GLOBAL_PROMPTS_QUERY_KEY = ['mbkGlobalPrompts'];

export function useMBKGlobalPrompts() {
  const queryClient = useQueryClient();

  const { data: prompts = [], isLoading, error, refetch } = useQuery({
    queryKey: MBK_GLOBAL_PROMPTS_QUERY_KEY,
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, prompt_text, anzeigename, ist_aktiv }) => {
      const res = await base44.functions.invoke('updateMBKGlobalPromptSecure', {
        id, prompt_text, anzeigename, ist_aktiv,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data?.updated || null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MBK_GLOBAL_PROMPTS_QUERY_KEY });
      toast.success('Prompt gespeichert.');
    },
    onError: (err) => {
      toast.error(err?.message || 'Speichern fehlgeschlagen.');
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('seedMBKGlobalPrompts', {});
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: MBK_GLOBAL_PROMPTS_QUERY_KEY });
      const created = data?.created ?? 0;
      const skipped = data?.skipped ?? 0;
      toast.success(`Seed ausgeführt: ${created} neu, ${skipped} bereits vorhanden.`);
    },
    onError: (err) => {
      toast.error(err?.message || 'Seed fehlgeschlagen.');
    },
  });

  return {
    prompts,
    isLoading,
    error,
    refetch,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    seed: seedMutation.mutateAsync,
    isSeeding: seedMutation.isPending,
  };
}

/**
 * Synchroner Lookup eines Prompt-Texts per Schlüssel.
 * Liefert null, wenn nicht vorhanden oder inaktiv — Aufrufer sollen dann
 * auf Hardcoded-Fallback zurückfallen.
 */
export function lookupMBKPromptText(prompts, schluessel) {
  if (!Array.isArray(prompts) || !schluessel) return null;
  const found = prompts.find((p) => p.schluessel === schluessel && p.ist_aktiv !== false);
  const text = found?.prompt_text;
  return text && text.trim() ? text : null;
}