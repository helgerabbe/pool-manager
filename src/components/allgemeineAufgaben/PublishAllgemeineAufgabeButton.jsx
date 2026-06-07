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
import { CheckCircle, RotateCw, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const REQUIRED_FIELDS = [
  { key: 'titel', label: 'Titel' },
  { key: 'aufgabenstellung', label: 'Aufgabenstellung' },
];

/**
 * PublishAllgemeineAufgabeButton
 * 
 * - Setzt content_status auf 'approved' oder zurück auf 'draft'
 * - Zeigt Sicherheitsabfrage wenn Pflichtfelder fehlen
 * - Admins/Fachschaftsleitung können Freigabe rückgängig machen
 */
export default function PublishAllgemeineAufgabeButton({ aufgabe, kannBearbeiten = false, userRole }) {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  const isApproved = aufgabe.content_status === 'approved';
  const canRevoke = !!kannBearbeiten; // jeder mit Bearbeitungsrecht kann rückgängig machen

  const validateAufgabe = () => {
    return REQUIRED_FIELDS
      .filter(({ key }) => {
        const value = aufgabe[key];
        return !value || (typeof value === 'string' && !value.trim());
      })
      .map(({ label }) => label);
  };

  const approveMutation = useMutation({
    mutationFn: async (data) => base44.entities.AllgemeineAufgabe.update(aufgabe.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('✅ Aufgabe freigegeben – jetzt im Export-Cockpit sichtbar');
      setShowWarning(false);
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const revokeMutation = useMutation({
    mutationFn: async () => base44.entities.AllgemeineAufgabe.update(aufgabe.id, { content_status: 'draft' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.info('Freigabe zurückgezogen – zurück zur Bearbeitung');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const handlePublish = () => {
    const missing = validateAufgabe();
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowWarning(true);
      return;
    }
    approveMutation.mutate({ content_status: 'approved' });
  };

  const handleForcePublish = () => {
    approveMutation.mutate({
      content_status: 'approved',
      titel: aufgabe.titel || 'Aufgabe ohne Titel',
      aufgabenstellung: aufgabe.aufgabenstellung || 'Aufgabenstellung folgt',
    });
  };

  if (!kannBearbeiten) return null;

  if (isApproved) {
    if (!canRevoke) return null;
    // Eine Aufgabe darf NICHT mehr aus der Freigabe gezogen werden, sobald sie
    // im Export-Cockpit für einen Export-Lauf vorgemerkt ist – egal ob Moodle
    // oder Brian. Der Status 'pending' bedeutet "wartet auf Bestätigung des
    // Export-Teams". Solange er anliegt, bleibt die Aufgabe schreibgeschützt.
    const isPendingExport =
      aufgabe.sync_status === 'pending' ||
      aufgabe.moodle_sync_status === 'pending' ||
      aufgabe.brian_sync_status === 'pending';
    return (
      <div className="flex flex-col gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => revokeMutation.mutate()}
          disabled={revokeMutation.isPending || isPendingExport}
          title={isPendingExport ? 'Die Freigabe kann gerade nicht zurückgenommen werden, weil sich die Aufgabe im Export befindet.' : undefined}
          className={
            isPendingExport
              ? 'gap-2 text-muted-foreground border-border bg-muted cursor-not-allowed'
              : 'gap-2 text-green-700 border-green-300 hover:bg-green-50'
          }
        >
          {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
          Freigabe rückgängig
        </Button>
        {isPendingExport && (
          <p className="text-[11px] text-orange-700 leading-snug max-w-xs">
            Diese Aufgabe ist momentan im Export und kann nicht bearbeitet werden.
            Sobald der Export abgeschlossen ist, kann man hier wieder arbeiten.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={handlePublish}
        disabled={approveMutation.isPending}
        size="sm"
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {approveMutation.isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <CheckCircle className="w-3.5 h-3.5" />}
        Freigeben
      </Button>

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
                    Möchtest du trotzdem freigeben? Fehlende Felder werden automatisch mit Platzhaltern gefüllt.
                  </p>
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={approveMutation.isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForcePublish}
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