import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, RotateCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ApprovalActionButton
 *
 * Freigabe-Logik:
 *
 * entityType='activity':
 *   → Freigeben setzt content_status='approved' auf der Aktivität
 *     UND auf allen zugehörigen MasterAufgaben + Klonen (Batch-Cascade)
 *   → Rückgängig setzt content_status='draft' auf der Aktivität
 *     UND auf allen zugehörigen MasterAufgaben + Klonen
 *   → Die Aktivität ist der Export-Anker: nur 'approved' Aktivitäten erscheinen im Cockpit
 *
 * entityType='master' | 'klon':
 *   → Setzt nur content_status auf dem jeweiligen Datensatz (interner Fertig-Marker)
 *   → Hat keinen direkten Einfluss auf den Export (der läuft über die Aktivität)
 */
export default function ApprovalActionButton({ entityId, entityType, contentStatus, missingFields = [], kannBearbeiten, activityId }) {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);

  const isApproved = contentStatus === 'approved';
  const isActivity = entityType === 'activity';
  const entityLabel = isActivity ? 'Aktivität' : entityType === 'klon' ? 'Klon' : 'Aufgabe';

  // Für Aktivitäts-Cascade: lade alle MasterAufgaben + Klone dieser Aktivität
  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', entityId],
    queryFn: () => base44.entities.MasterAufgabe.filter({ activity_id: entityId }),
    enabled: isActivity,
  });

  const setCascadeStatus = async (status) => {
    // Setze Status auf alle Master dieser Aktivität + deren Klone
    // Bei Fehler: weiter mit anderen Mastern (kein Hard-Stop), aber Error loggen
    const errors = [];
    for (const master of masterAufgaben) {
      try {
        await base44.entities.MasterAufgabe.update(master.id, { content_status: status });
        const klone = await base44.entities.Aufgabenbausteine.filter({ master_aufgabe_id: master.id });
        for (const klon of klone) {
          try {
            await base44.entities.Aufgabenbausteine.update(klon.id, { content_status: status });
          } catch (e) {
            errors.push(`Klon ${klon.id}: ${e.message}`);
          }
        }
      } catch (e) {
        errors.push(`Master ${master.id}: ${e.message}`);
      }
    }
    if (errors.length > 0) {
      console.warn('[ApprovalCascade] Teilfehler bei Statusübernahme:', errors);
      toast.warning(`Status übernommen, aber ${errors.length} Unteraufgabe(n) konnten nicht aktualisiert werden.`);
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (isActivity) {
        await base44.entities.LernpaketPhaseAktivitaet.update(entityId, { content_status: 'approved' });
        await setCascadeStatus('approved');
      } else if (entityType === 'klon') {
        await base44.entities.Aufgabenbausteine.update(entityId, { content_status: 'approved' });
      } else {
        await base44.entities.MasterAufgabe.update(entityId, { content_status: 'approved' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      setShowWarning(false);
      if (isActivity) {
        toast.success('✅ Aktivität freigegeben – alle Aufgaben für den Export bereit.');
      } else {
        toast.success('✓ Als fertig markiert.');
      }
    },
    onError: (err) => toast.error('Fehler: ' + err.message),
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (isActivity) {
        await base44.entities.LernpaketPhaseAktivitaet.update(entityId, { content_status: 'draft' });
        await setCascadeStatus('draft');
      } else if (entityType === 'klon') {
        await base44.entities.Aufgabenbausteine.update(entityId, { content_status: 'draft' });
      } else {
        await base44.entities.MasterAufgabe.update(entityId, { content_status: 'draft' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      if (isActivity) {
        toast.info('Freigabe zurückgezogen – Aktivität wieder bearbeitbar.');
      } else {
        toast.info('Fertig-Markierung zurückgezogen.');
      }
    },
    onError: (err) => toast.error('Fehler: ' + err.message),
  });

  const handleApproveClick = () => {
    if (missingFields.length > 0) {
      setShowWarning(true);
    } else {
      approveMutation.mutate();
    }
  };

  if (!kannBearbeiten) return null;

  if (isApproved) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => reverseMutation.mutate()}
        disabled={reverseMutation.isPending}
        className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
      >
        {reverseMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        Freigabe rückgängig
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="default"
        onClick={handleApproveClick}
        disabled={approveMutation.isPending}
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
        {isActivity ? 'Freigeben' : 'Als fertig markieren'}
      </Button>

      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <AlertDialogTitle>Inhalt unvollständig</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 space-y-2">
                  <p>Folgende Felder sind noch nicht ausgefüllt:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                  <p className="pt-1">Trotzdem {isActivity ? 'freigeben' : 'als fertig markieren'}?</p>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={approveMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Wird gespeichert...' : 'Ja, trotzdem'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}