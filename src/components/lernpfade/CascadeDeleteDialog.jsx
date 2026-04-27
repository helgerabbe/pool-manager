/**
 * CascadeDeleteDialog.jsx
 *
 * Confirm-Modal für das Löschen eines NICHT-leeren Bündel-Containers
 * (siehe Logbuch §18, Phase 3.5).
 *
 * Verhalten:
 *   - Wird NUR angezeigt, wenn das zu löschende Bündel mindestens ein Kind
 *     enthält. Leere Bündel werden vom Aufrufer (Cockpit) ohne Warnung gelöscht.
 *   - Sachlicher Text: "Dieses Bündel enthält [X] Aufgaben. Beim Löschen
 *     werden diese Aufgaben vom Dashboard entfernt und stehen wieder im
 *     Pool zur Verfügung."
 *   - Primärer Button (rot, destruktiv): "Bündel löschen".
 *   - Sekundärer Button: "Abbrechen".
 *
 * Diese Komponente kapselt nur die UI. Die eigentliche Mutation
 * (`removeBundleAndCascade` + Junction-Sync) erledigt der Aufrufer im
 * Cockpit nach `onConfirm`.
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
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export default function CascadeDeleteDialog({
  open,
  onOpenChange,
  bundleTitle = 'Bündel',
  childCount = 0,
  onConfirm,
}) {
  const aufgabenWort = childCount === 1 ? 'Aufgabe' : 'Aufgaben';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Bündel „{bundleTitle}" löschen?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 leading-relaxed">
            <span className="block">
              Dieses Bündel enthält <strong>{childCount} {aufgabenWort}</strong>.
            </span>
            <span className="block">
              Beim Löschen des Bündels werden diese Aufgaben vom Dashboard entfernt
              und stehen wieder im Pool zur Verfügung. Die Aufgaben selbst werden
              nicht gelöscht.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Bündel löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}