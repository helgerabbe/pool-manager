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
import { Loader2, CheckCircle2, MoreVertical, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

/**
 * PackageApprovalAction
 *
 * Batch-Freigabe für alle Aktivitäten in einem Lernpaket.
 * Die Freigabe (content_status='approved') wird auf Aktivitäts-Ebene gesetzt.
 * Falls unvollständige Aktivitäten existieren → Sicherheitsabfrage.
 */
export default function PackageApprovalAction({ paketId, paketTitel, kannBearbeiten }) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [incompleteInfo, setIncompleteInfo] = useState(null); // { incompleteCount, totalCount, incomplete }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
  };

  // Erster Aufruf: ohne force – prüft ob unvollständige vorhanden
  const checkMutation = useMutation({
    mutationFn: () => base44.functions.invoke('approvePackageActivities', { paketId, force: false }),
    onSuccess: (res) => {
      const data = res.data;
      if (data.needsConfirmation) {
        // Unvollständige vorhanden → Dialog zeigen
        setIncompleteInfo({
          incompleteCount: data.incompleteCount,
          totalCount: data.totalCount,
          incomplete: data.incomplete,
        });
        setShowConfirm(true);
      } else if (data.success) {
        invalidate();
        toast.success(`✓ ${data.approvedCount} Aktivitäten in "${paketTitel}" freigegeben.`);
      }
    },
    onError: (err) => toast.error('Fehler: ' + err.message),
  });

  // Zweiter Aufruf: mit force=true – setzt Standardwerte und gibt frei
  const forceMutation = useMutation({
    mutationFn: () => base44.functions.invoke('approvePackageActivities', { paketId, force: true }),
    onSuccess: (res) => {
      const data = res.data;
      invalidate();
      setShowConfirm(false);
      setIncompleteInfo(null);
      toast.success(`✓ ${data.approvedCount} Aktivitäten in "${paketTitel}" freigegeben (${data.incompleteCount} mit Standardwerten aufgefüllt).`);
    },
    onError: (err) => toast.error('Fehler: ' + err.message),
  });

  if (!kannBearbeiten) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending}
            className="gap-2 cursor-pointer"
          >
            {checkMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Alle Aktivitäten freigeben
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sicherheitsabfrage bei unvollständigen Aktivitäten */}
      <AlertDialog open={showConfirm} onOpenChange={(open) => {
        setShowConfirm(open);
        if (!open) setIncompleteInfo(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <AlertDialogTitle>Nicht alle Aktivitäten vollständig</AlertDialogTitle>
                <AlertDialogDescription className="mt-2 space-y-2">
                  <p>
                    <strong>{incompleteInfo?.incompleteCount}</strong> von <strong>{incompleteInfo?.totalCount}</strong> Aktivitäten in „{paketTitel}" haben noch nicht alle Pflichtfelder ausgefüllt:
                  </p>
                  {incompleteInfo?.incomplete?.length > 0 && (
                    <ul className="list-disc pl-5 text-sm space-y-0.5">
                      {incompleteInfo.incomplete.map((a) => (
                        <li key={a.id}>{a.name}</li>
                      ))}
                    </ul>
                  )}
                  <p className="pt-1 text-muted-foreground">
                    Möchtest du trotzdem alle freigeben? Fehlende Pflichtfelder werden automatisch mit Platzhaltern befüllt.
                  </p>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={forceMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => forceMutation.mutate()}
              disabled={forceMutation.isPending}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              {forceMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Ja, trotzdem freigeben
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}