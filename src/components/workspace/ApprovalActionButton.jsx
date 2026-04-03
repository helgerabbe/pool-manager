import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
 * Setzt content_status (pädagogische Freigabe), NICHT sync_status.
 * sync_status wird erst beim Export-Vorgang im Cockpit gesetzt.
 * 
 * Props:
 *   entityId       – ID des Datensatzes
 *   entityType     – 'activity' | 'klon' | 'master'
 *   contentStatus  – aktueller content_status des Datensatzes ('draft' | 'approved')
 *   missingFields  – optionales Array mit Namen fehlender Pflichtfelder für Sicherheitsabfrage
 *   kannBearbeiten – allgemeine Bearbeitungsberechtigung
 *   userRole       – Rolle des eingeloggten Nutzers (Benutzer-Entity)
 */
export default function ApprovalActionButton({ entityId, entityType, contentStatus, missingFields = [], kannBearbeiten, userRole }) {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  
  const isApproved = contentStatus === 'approved';

  // Alle Rollen dürfen freigeben UND auch die Freigabe wieder aufheben
  const canRevokeApproval = !!kannBearbeiten; // jeder mit Bearbeitungsrecht kann rückgängig machen

  const entityLabel = entityType === 'activity' ? 'Aktivität' : entityType === 'klon' ? 'Klon' : 'Masteraufgabe';

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (entityType === 'activity') {
        return base44.entities.LernpaketPhaseAktivitaet.update(entityId, { content_status: 'approved' });
      } else if (entityType === 'klon') {
        return base44.entities.Aufgabenbausteine.update(entityId, { content_status: 'approved' });
      } else if (entityType === 'master') {
        return base44.entities.MasterAufgabe.update(entityId, { content_status: 'approved' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setShowWarning(false);
      toast.success(`✅ ${entityLabel} freigegeben – jetzt im Export-Cockpit sichtbar.`);
    },
    onError: (err) => {
      toast.error('Fehler beim Freigeben: ' + err.message);
    }
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (entityType === 'activity') {
        return base44.entities.LernpaketPhaseAktivitaet.update(entityId, { content_status: 'draft' });
      } else if (entityType === 'klon') {
        return base44.entities.Aufgabenbausteine.update(entityId, { content_status: 'draft' });
      } else if (entityType === 'master') {
        return base44.entities.MasterAufgabe.update(entityId, { content_status: 'draft' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.info('Freigabe zurückgezogen – zurück zur Bearbeitung.');
    }
  });

  const handleApproveClick = () => {
    // Wenn Pflichtfelder fehlen → Sicherheitsabfrage
    if (missingFields.length > 0) {
      setShowWarning(true);
    } else {
      approveMutation.mutate();
    }
  };

  if (isApproved) {
    if (!canRevokeApproval) {
      // Lehrer sehen nur den grünen Status-Hinweis, kein Rückgängig-Button
      return null;
    }
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
        Freigeben
      </Button>

      {/* Sicherheitsabfrage bei fehlenden Pflichtfeldern */}
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
                  <p className="pt-1">
                    Möchtest du trotzdem freigeben? Fehlende Felder werden mit Platzhaltertexten gefüllt.
                  </p>
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
              {approveMutation.isPending ? 'Wird freigegeben...' : 'Ja, trotzdem freigeben'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}