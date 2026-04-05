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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Ungespeicherte Änderungen
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Es gibt ungespeicherte Änderungen. Wie möchten Sie fortfahren?
        </p>
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="gap-2 sm:order-1"
          >
            <X className="w-4 h-4" /> Abbrechen
          </Button>
          <Button
            variant="destructive"
            onClick={onDiscard}
            disabled={saving}
            className="gap-2 sm:order-2"
          >
            <Trash2 className="w-4 h-4" /> Verwerfen & Beenden
          </Button>
          <Button
            onClick={onSaveAndExit}
            disabled={saving}
            className="gap-2 sm:order-3"
          >
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Save className="w-4 h-4" />
            }
            Speichern & Beenden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}