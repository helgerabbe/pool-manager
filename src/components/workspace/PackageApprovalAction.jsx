import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PackageApprovalAction({ paketId, paketTitel, kannBearbeiten }) {
  const queryClient = useQueryClient();

  const approvePaketMutation = useMutation({
    mutationFn: async () => {
      return base44.functions.invoke('approvePackageActivities', { paketId });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success(`✓ ${result.data?.approvedCount || 0} Aktivitäten in "${paketTitel}" freigegeben.`);
    },
    onError: (err) => {
      toast.error('Fehler beim Freigeben des Pakets: ' + err.message);
    }
  });

  if (!kannBearbeiten) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => approvePaketMutation.mutate()}
          disabled={approvePaketMutation.isPending}
          className="gap-2 cursor-pointer"
        >
          {approvePaketMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Ganzes Paket freigeben
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}