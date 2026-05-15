import { base44 } from '@/api/base44Client';

export async function syncMasterStatusNow({ queryClient, master, fieldValues }) {
  if (!queryClient || !master?.id) return;

  await base44.functions.invoke('masterAufgabeTouchActivity', {
    event: { type: 'update', entity_id: master.id },
    data: {
      ...master,
      field_values: fieldValues || master.field_values || {},
    },
  });

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] }),
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] }),
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] }),
    queryClient.invalidateQueries({ queryKey: ['workspace-data'] }),
    queryClient.invalidateQueries({ queryKey: ['einheiten-list-secure'] }),
  ]);
}

export function refreshWorkspaceStatusQueries(queryClient) {
  if (!queryClient) return;

  queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
  queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
  queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
  queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
  queryClient.invalidateQueries({ queryKey: ['einheiten-list-secure'] });
}