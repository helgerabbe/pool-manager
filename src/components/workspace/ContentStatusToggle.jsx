import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ContentStatusToggle({ 
  entityId, 
  entityType, 
  contentStatus, 
  canToggle = true,
  onToggled 
}) {
  const queryClient = useQueryClient();
  const isDraft = contentStatus === 'draft';

  const toggleMutation = useMutation({
    mutationFn: async (newStatus) => {
      if (entityType === 'klon' || entityType === 'aufgabe') {
        return base44.entities.Aufgabenbausteine.update(entityId, { content_status: newStatus });
      } else if (entityType === 'activity') {
        return base44.entities.LernpaketPhaseAktivitaet.update(entityId, { content_status: newStatus });
      } else if (entityType === 'master') {
        return base44.entities.MasterAufgabe.update(entityId, { content_status: newStatus });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.success(isDraft ? '✓ Fertig für Export markiert' : '✓ Zurück zur Bearbeitung');
      onToggled?.();
    },
    onError: (err) => {
      toast.error('Fehler beim Speichern: ' + err.message);
    },
  });

  const handleToggle = () => {
    const newStatus = isDraft ? 'approved' : 'draft';
    toggleMutation.mutate(newStatus);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Badge mit Status */}
      <Badge className={cn(
        'flex items-center gap-1.5 font-medium px-3 py-1',
        isDraft
          ? 'bg-red-100 text-red-700 border-red-300'
          : 'bg-green-100 text-green-700 border-green-300'
      )}>
        <span className="text-lg">{isDraft ? '🔴' : '🟢'}</span>
        {isDraft ? 'In Bearbeitung' : 'Fertig für Export'}
      </Badge>

      {/* Toggle-Schalter */}
      {canToggle && (
        <div className="flex items-center gap-2">
          <Switch
            checked={!isDraft}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            className="data-[state=checked]:bg-green-600"
          />
          {toggleMutation.isPending && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
    </div>
  );
}