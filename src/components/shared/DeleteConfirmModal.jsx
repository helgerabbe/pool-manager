import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({ open, onClose, onConfirm, titel, isLoading }) {
  return (
    <AlertDialog open={open} onOpenChange={isLoading ? undefined : onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                <span className="text-amber-700">Einheit wird gelöscht…</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="text-destructive">Einheit löschen</span>
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className={`text-sm ${isLoading ? 'text-muted-foreground' : 'text-foreground'}`}>
            {isLoading ? (
              <span>Bitte warten – die Einheit wird unwiderruflich gelöscht…</span>
            ) : (
              <>
                <span className="font-semibold">Achtung:</span> Möchten Sie die Einheit{' '}
                <span className="font-semibold">„{titel}"</span> wirklich löschen? Alle zugehörigen
                Lernpakete, Lernziele, Aufgaben und Mappings werden{' '}
                <span className="text-destructive font-semibold">unwiderruflich</span> aus der Datenbank entfernt.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!isLoading && (
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unwiderruflich löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}