import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
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
import { Loader2, CheckCircle2, RotateCw, AlertTriangle, ShieldAlert } from 'lucide-react';
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
/**
 * Frontend-Mirror: Validiert lokal, ob User Genehmigungsrechte hat.
 * Wird für visuelles Feedback verwendet, Backend-Funktion macht finale Validierung.
 */
function validateApprovalPermissionLocal(rolle, faecher, targetFach, delegatedMembership, action) {
  // Admin: immer erlaubt
  if (rolle === 'Administrator') return true;
  
  // Fachschaft: nur im eigenen Fach
  if (rolle === 'Fachschaftsleitung') {
    return Array.isArray(faecher) && faecher.includes(targetFach);
  }
  
  // Lehrkraft: nur mit delegierter LEITUNG
  if (rolle === 'Fachlehrkraft') {
    if (action === 'approve') return delegatedMembership?.unit_role === 'LEITUNG';
    return delegatedMembership?.unit_role === 'LEITUNG' || delegatedMembership?.unit_role === 'EDITOR';
  }
  
  return false;
}

export default function ApprovalActionButton({ 
  entityId, 
  entityType, 
  contentStatus, 
  missingFields = [], 
  kannBearbeiten, 
  activityId,
  einheitFach,  // ← NEU: Fachbereich
  einheitId     // ← NEU: Einheit ID für Scope
}) {
  const queryClient = useQueryClient();
  const { permissions, rolle, faecher } = useRBAC();
  const [showWarning, setShowWarning] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const isApproved = contentStatus === 'approved';
  const isActivity = entityType === 'activity';
  const entityLabel = isActivity ? 'Aktivität' : entityType === 'klon' ? 'Klon' : 'Aufgabe';

  // ✅ Delegierte Berechtigung laden (für Frontend-Validierung)
  const { data: delegatedMembership } = useQuery({
    queryKey: ['einheit-members', einheitId, 'current'],
    queryFn: async () => {
      if (!einheitId) return null;
      const result = await base44.entities.EinheitMembers.filter({
        einheit_id: einheitId,
        user_email: (await base44.auth.me()).email
      });
      return result[0];
    },
    enabled: !!einheitId,
    staleTime: 5000,
  });

  // Lokale Validierung (für visuelles Feedback)
  const canApprove = validateApprovalPermissionLocal(rolle, faecher, einheitFach, delegatedMembership, 'approve');
  const canUnapprove = validateApprovalPermissionLocal(rolle, faecher, einheitFach, delegatedMembership, 'unapprove');

  // Für Aktivitäts-Cascade: lade alle MasterAufgaben + Klone dieser Aktivität
  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', entityId],
    queryFn: () => base44.entities.MasterAufgabe.filter({ activity_id: entityId }),
    enabled: isActivity,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!isActivity) {
        // Für Master/Klone: direkt Backend verwenden (kein Cascade)
        if (entityType === 'klon') {
          await base44.functions.invoke('approveActivitySecure', {
            entityId,
            action: 'approve',
            einheitId,
            targetFach: einheitFach
          });
        } else {
          // Master: auch via Backend für Konsistenz
          await base44.functions.invoke('approveActivitySecure', {
            entityId,
            action: 'approve',
            einheitId,
            targetFach: einheitFach
          });
        }
      } else {
        // ✅ Aktivität mit Cascade via sichere Backend-Funktion
        await base44.functions.invoke('approveActivitySecure', {
          entityId,
          action: 'approve',
          einheitId,
          targetFach: einheitFach
        });
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
    onError: (err) => {
      const msg = err.message || '';
      toast.error(
        msg.includes('Berechtigung')
          ? '🔒 Sie haben nicht die erforderlichen Berechtigungen.'
          : 'Fehler: ' + msg
      );
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      // ✅ Unapprove via sichere Backend-Funktion (auch mit Cascade)
      await base44.functions.invoke('approveActivitySecure', {
        entityId,
        action: 'unapprove',
        einheitId,
        targetFach: einheitFach
      });
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
    onError: (err) => {
      const msg = err.message || '';
      toast.error(
        msg.includes('Berechtigung')
          ? '🔒 Sie haben nicht die erforderlichen Berechtigungen.'
          : 'Fehler: ' + msg
      );
    },
  });

  const handleApproveClick = () => {
    if (!canApprove) {
      setValidationError('Sie haben nicht die erforderlichen Berechtigungen.');
      return;
    }
    if (missingFields.length > 0) {
      setShowWarning(true);
    } else {
      approveMutation.mutate();
    }
  };

  if (!kannBearbeiten) return null;

  // ✅ Validierungsfehler: zeige gelock-en Button
  if (validationError && !isApproved) {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled
        className="gap-2 text-destructive"
        title={validationError}
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        Keine Berechtigung
      </Button>
    );
  }

  if (isApproved) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => reverseMutation.mutate()}
        disabled={reverseMutation.isPending || !canUnapprove}
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
        disabled={approveMutation.isPending || !canApprove}
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