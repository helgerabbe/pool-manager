/**
 * UnsavedChangesExitModal.jsx
 *
 * Wiederverwendbares Modal für den Exit-Prozess aus dem Bearbeitungsmodus.
 * Drei Optionen: Speichern & Beenden | Verwerfen | Abbrechen
 */
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Save, Trash2, X, Loader2 } from 'lucide-react';

export default function UnsavedChangesExitModal({ open, onOpenChange, onSaveAndExit, onDiscard, saving }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-base font-semibold">Ungespeicherte Änderungen</p>
              <p className="text-xs text-muted-foreground font-normal mt-1">Wie möchten Sie fortfahren?</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-2">
          <p className="text-sm text-amber-900">
            Ihre Änderungen werden <strong>nicht gespeichert</strong>, wenn Sie diese Option wählen.
          </p>
        </div>

        <DialogFooter className="flex gap-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" /> Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={onDiscard}
            disabled={saving}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Verwerfen
          </Button>
          <Button
            onClick={onSaveAndExit}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Speichert...</>
              : <><Save className="w-4 h-4 mr-2" /> Speichern & Beenden</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}