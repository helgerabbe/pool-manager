import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUnterrichtseinheitLoeschen } from '@/hooks/useFachEinheitInhalte';

/**
 * Löschen einer LEEREN Unterrichtseinheit.
 *
 * Der Knopf erscheint nur, wenn weder Unterrichtsstunden noch Übungsblöcke
 * darin liegen. Die Unterrichtseinheit ist ohnehin nur eine Ordnungsmappe —
 * gelöscht wird die Hülle, nie Inhalte.
 */
export default function FachEinheitLoeschenButton({ unterrichtseinheit }) {
  const [offen, setOffen] = useState(false);
  const loeschen = useUnterrichtseinheitLoeschen();

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Leere Unterrichtseinheit löschen"
        className="p-1 rounded text-muted-foreground hover:bg-red-100 hover:text-red-600"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <AlertDialog open={offen} onOpenChange={setOffen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unterrichtseinheit löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              „{unterrichtseinheit.titel}" ist leer — es liegen keine Unterrichtsstunden und keine
              Übungsblöcke darin. Die Mappe wird entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                loeschen.mutate(unterrichtseinheit.id, { onSuccess: () => setOffen(false) });
              }}
              disabled={loeschen.isPending}
              className="bg-red-600 hover:bg-red-700 gap-2"
            >
              {loeschen.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Ja, löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}