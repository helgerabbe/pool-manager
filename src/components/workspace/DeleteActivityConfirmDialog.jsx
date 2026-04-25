/**
 * DeleteActivityConfirmDialog.jsx
 *
 * Bestätigungs-Dialog für das Löschen einer Aktivität in Tab 3.
 * Stellt klar, dass der Vorgang unwiderruflich ist und alle zugehörigen
 * Inhalte (Master-Aufgaben, Klone) ebenfalls entfernt werden.
 */

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
import { Loader2, AlertTriangle } from 'lucide-react';

export default function DeleteActivityConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
  activityName = 'diese Aktivität',
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Aktivität wirklich löschen?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Möchten Sie <strong>{activityName}</strong> wirklich löschen?
              Alle zugehörigen Inhalte werden unwiderruflich entfernt.
            </span>
            <span className="block text-xs text-muted-foreground">
              Dazu gehören alle Masteraufgaben, KI-generierten Varianten
              und gespeicherten Eingaben dieser Aktivität.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Lösche…
              </>
            ) : (
              'Endgültig löschen'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}