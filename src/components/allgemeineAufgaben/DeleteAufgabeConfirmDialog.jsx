import React, { useState, useEffect } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

/**
 * Sicherheitsabfrage vor dem Löschen einer allgemeinen Aufgabe.
 *
 * Löschen ist nicht rückholbar — und weil in einer Aufgabensequenz die ganze
 * Arbeit vieler Schritte steckt, verlangt der Dialog eine bewusste Eingabe
 * ("LÖSCHEN"), damit ein versehentlicher Klick nichts vernichtet.
 */
export default function DeleteAufgabeConfirmDialog({ open, onOpenChange, aufgabe, isDeleting, onConfirm }) {
  const [eingabe, setEingabe] = useState('');
  useEffect(() => { if (open) setEingabe(''); }, [open]);

  const titel = aufgabe?.titel?.trim() || 'Aufgabe ohne Titel';
  const schritte = Array.isArray(aufgabe?.sequenz_schritte) ? aufgabe.sequenz_schritte.length : 0;
  const bestaetigt = eingabe.trim().toUpperCase() === 'LÖSCHEN';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Aufgabe endgültig löschen?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Du löschst die Aufgabe <strong>„{titel}"</strong>
                {schritte > 0 && <> mit <strong>{schritte} {schritte === 1 ? 'Schritt' : 'Schritten'}</strong></>}.
                Das kann <strong>nicht</strong> rückgängig gemacht werden — alle Inhalte,
                Materialien und Einstellungen dieser Aufgabe sind dann weg.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Tippe zur Bestätigung <span className="font-mono">LÖSCHEN</span> ein:
                </Label>
                <Input
                  value={eingabe}
                  onChange={(e) => setEingabe(e.target.value)}
                  placeholder="LÖSCHEN"
                  autoFocus
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            disabled={!bestaetigt || isDeleting}
            onClick={(e) => { e.preventDefault(); onConfirm?.(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isDeleting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Löschen…</>
              : <><Trash2 className="w-4 h-4" /> Endgültig löschen</>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}