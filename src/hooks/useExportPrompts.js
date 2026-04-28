/**
 * useExportPrompts.js
 *
 * React-Query-Hook für die ExportPrompts-Entity.
 * Liefert die Liste aller Prompts einer Einheit + eine Upsert-Mutation,
 * die ein bestehendes Tripel (einheit_id, prompt_type, reference_id)
 * aktualisiert oder neu anlegt.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { findExistingPrompt } from '@/lib/exportPromptSync';
import { MBK_TEMPLATE_VERSION } from '@/lib/exportPromptTemplates';

export function useExportPrompts(einheitId) {
  const queryClient = useQueryClient();

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['exportPrompts', einheitId],
    queryFn: () => base44.entities.ExportPrompts.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
    staleTime: 30 * 1000,
  });

  // Schreibt über die Backend-Funktion `bulkUpsertExportPrompts` (auch für
  // einzelne Items), damit RLS-Schreibrechte auf der Entity nicht zum
  // Stolperstein werden — die Funktion läuft mit Service-Role und prüft die
  // Rolle des aufrufenden Users selbst.
  const upsert = useMutation({
    mutationFn: async ({ promptType, referenceId = null, content, isCustomized = false, sourceUpdatedAt }) => {
      const res = await base44.functions.invoke('bulkUpsertExportPrompts', {
        einheit_id: einheitId,
        items: [{
          prompt_type: promptType,
          reference_id: referenceId,
          content,
          is_customized: isCustomized,
          source_updated_at: sourceUpdatedAt || new Date().toISOString(),
          template_version: MBK_TEMPLATE_VERSION,
        }],
      });
      const data = res?.data || res;
      if (data?.error) throw new Error(data.error);
      if (Array.isArray(data?.errors) && data.errors.length > 0) {
        throw new Error(data.errors[0]?.reason || 'Fehler beim Speichern');
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportPrompts', einheitId] }),
  });

  return {
    prompts,
    isLoading,
    upsert: (args) => upsert.mutateAsync(args),
    isUpserting: upsert.isPending,
  };
}