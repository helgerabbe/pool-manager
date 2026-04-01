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
import { AlertTriangle, Save } from 'lucide-react';

/**
 * UnsavedChangesModal
 * ─────────────────────────────────────────────────────────────────
 * Modal, das angezeigt wird, wenn der Nutzer versucht,
 * ohne Speichern zu navigieren.
 *
 * Props:
 * - open: boolean — Modal sichtbar?
 * - onSave: () => Promise<void> — wird aufgerufen, wenn "Speichern & Verlassen" geklickt
 * - onDiscard: () => void — wird aufgerufen, wenn "Verwerfen & Verlassen" geklickt
 * - onCancel: () => void — wird aufgerufen, wenn "Abbrechen" geklickt
 * - isSaving: boolean — wird während des Speicherns true
 */

export default function UnsavedChangesModal({
  open,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Ungespeicherte Änderungen
          </AlertDialogTitle>
          <AlertDialogDescription>
            Du hast Änderungen an der Struktur vorgenommen. Möchtest du diese jetzt speichern oder verwerfen?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex gap-2 sm:flex-row">
          <AlertDialogCancel onClick={onCancel} className="sm:flex-1">
            Abbrechen
          </AlertDialogCancel>

          <button
            onClick={onDiscard}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-input sm:flex-1"
          >
            Verwerfen & Verlassen
          </button>

          <AlertDialogAction
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 sm:flex-1"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Speichern & Verlassen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}