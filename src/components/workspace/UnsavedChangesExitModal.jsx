/**
 * UnsavedChangesExitModal.jsx
 *
 * Wiederverwendbares Modal für den Exit-Prozess aus dem Bearbeitungsmodus.
 * Drei Optionen: Speichern & Beenden | Verwerfen | Abbrechen
 */
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
import { AlertTriangle, Save, Trash2, Loader2 } from 'lucide-react';

export default function UnsavedChangesExitModal({ open, onOpenChange, onSaveAndExit, onDiscard, saving }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">Ungespeicherte Änderungen</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 space-y-3">
                <p>Es gibt ungespeicherte Änderungen. Was möchten Sie tun?</p>
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-900">
                  <p><strong>Warnung:</strong> Wenn Sie verwerfen, gehen alle Änderungen verloren.</p>
                </div>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex gap-2 justify-end pt-2">
          <AlertDialogCancel disabled={saving} className="gap-2">
            Abbrechen
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onDiscard}
            disabled={saving}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" /> Verwerfen
          </Button>
          <Button
            onClick={onSaveAndExit}
            disabled={saving}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichert...</>
              : <><Save className="w-4 h-4" /> Speichern & Beenden</>
            }
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}