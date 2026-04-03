import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * ContentStatusToggle
 * 
 * Toggle für content_status ('draft' ↔ 'approved').
 * Props:
 *   entityId      – ID des Datensatzes
 *   entityType    – 'klon' | 'aufgabe' | 'activity' | 'master'
 *   contentStatus – aktueller content_status
 *   missingFields – optionale Liste fehlender Pflichtfelder
 *   canToggle     – Bearbeitungsberechtigung
 *   onToggled     – Callback nach Statuswechsel
 */
export default function ContentStatusToggle({ 
  entityId, 
  entityType, 
  contentStatus, 
  missingFields = [],
  canToggle = true,
  onToggled 
}) {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
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
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setShowWarning(false);
      toast.success(newStatus === 'approved' ? '✅ Freigegeben – jetzt im Export-Cockpit sichtbar' : '✓ Zurück zur Bearbeitung');
      onToggled?.();
    },
    onError: (err) => {
      toast.error('Fehler beim Speichern: ' + err.message);
    },
  });

  const handleToggle = () => {
    if (isDraft) {
      // Wechsel zu approved → ggf. Sicherheitsabfrage
      if (missingFields.length > 0) {
        setShowWarning(true);
      } else {
        toggleMutation.mutate('approved');
      }
    } else {
      // Wechsel zu draft → direkt ohne Dialog
      toggleMutation.mutate('draft');
    }
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Badge className={cn(
          'flex items-center gap-1.5 font-medium px-3 py-1',
          isDraft
            ? 'bg-amber-100 text-amber-700 border border-amber-300'
            : 'bg-green-100 text-green-700 border border-green-300'
        )}>
          <span className="text-lg">{isDraft ? '🟡' : '🟢'}</span>
          {isDraft ? 'In Bearbeitung' : 'Freigegeben'}
        </Badge>

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

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <AlertDialogTitle>Pflichtfelder unvollständig</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 space-y-2">
                  <p>Folgende Felder sind noch nicht ausgefüllt:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <p className="pt-1">Möchtest du trotzdem freigeben?</p>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={toggleMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleMutation.mutate('approved')}
              disabled={toggleMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              Ja, freigeben
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}