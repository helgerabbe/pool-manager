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

  const upsert = useMutation({
    mutationFn: async ({ promptType, referenceId = null, content, isCustomized = false, sourceUpdatedAt }) => {
      const existing = findExistingPrompt(prompts, { einheitId, promptType, referenceId });
      const payload = {
        einheit_id: einheitId,
        prompt_type: promptType,
        reference_id: referenceId,
        content,
        is_customized: isCustomized,
        source_updated_at: sourceUpdatedAt || new Date().toISOString(),
        template_version: MBK_TEMPLATE_VERSION,
      };
      if (existing) {
        return base44.entities.ExportPrompts.update(existing.id, payload);
      }
      return base44.entities.ExportPrompts.create(payload);
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