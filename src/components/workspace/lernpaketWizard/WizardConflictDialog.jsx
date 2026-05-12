/**
 * components/workspace/lernpaketWizard/WizardConflictDialog.jsx
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.6).
 *
 * Wird nur dann eingeblendet, wenn das Lernpaket beim Klick auf
 * "Übernehmen" bereits Aktivitäten enthält. Die Lehrkraft entscheidet:
 *   – Additive: neue Hüllen anhängen
 *   – Overwrite: bestehende Hüllen tombstonen, neue ab Position 0
 */
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';

export default function WizardConflictDialog({
  open,
  onClose,
  existingCount,
  newCount,
  onChoose,
  isApplying,
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isApplying) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Bestehende Aktivitäten gefunden
          </DialogTitle>
          <DialogDescription>
            Das Lernpaket enthält bereits <strong>{existingCount}</strong> Aktivität{existingCount !== 1 ? 'en' : ''}.
            Wie soll mit dem neuen Vorschlag ({newCount} neu) verfahren werden?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            type="button"
            disabled={isApplying}
            onClick={() => onChoose('additive')}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <Plus className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Anhängen (empfohlen)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bestehende Aktivitäten bleiben unverändert. Neue Hüllen werden am Ende der jeweiligen Phase eingefügt.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={isApplying}
            onClick={() => onChoose('overwrite')}
            className="w-full text-left p-4 rounded-lg border-2 border-border hover:border-destructive hover:bg-destructive/5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">Komplett ersetzen</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alle bestehenden Aktivitäten werden zur Löschung markiert (Tombstone). Inhalte gehen verloren.
                </p>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}