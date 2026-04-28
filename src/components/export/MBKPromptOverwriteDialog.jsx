/**
 * MBKPromptOverwriteDialog.jsx
 *
 * Bestätigungs-Modal vor dem Überschreiben eines manuell angepassten
 * Prompts. Schützt vor versehentlichem Verlust handgeschriebener Inhalte.
 */
import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export default function MBKPromptOverwriteDialog({ open, onOpenChange, onConfirm, promptLabel }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Manuelle Anpassungen überschreiben?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Der Prompt <strong>„{promptLabel}"</strong> wurde manuell bearbeitet.
              Eine Neugenerierung verwirft diese Änderungen unwiderruflich.
            </p>
            <p className="text-amber-700 text-sm">
              Möchten Sie wirklich überschreiben?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Ja, überschreiben
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}