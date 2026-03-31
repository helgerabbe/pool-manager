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
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmModal({ open, onClose, onConfirm, titel, isLoading }) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Einheit löschen
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-foreground">
            <span className="font-semibold">Achtung:</span> Möchten Sie die Einheit{' '}
            <span className="font-semibold">„{titel}"</span> wirklich löschen? Alle zugehörigen
            Lernpakete, Lernziele, Aufgaben und Mappings werden{' '}
            <span className="text-destructive font-semibold">unwiderruflich</span> aus der Datenbank entfernt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? 'Wird gelöscht…' : 'Unwiderruflich löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}