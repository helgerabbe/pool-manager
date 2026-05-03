/**
 * EinheitFreigabeConfirmDialog.jsx
 *
 * Bestätigungsdialog vor der finalen Einheits-Freigabe (Schritt 3).
 * Erklärt klar, was sich ändert: ALLE Inhalte werden ab sofort gesperrt
 * (Tab 5 wird read-only). Die Aktion lässt sich später über
 * „Freigabe aufheben" zurücknehmen.
 */

import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function EinheitFreigabeConfirmDialog({
  open,
  onOpenChange,
  busy = false,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Einheit final freigeben
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm leading-snug">
          <p>
            Alle vier Lerntyp-Dashboards sind geprüft. Mit der finalen Freigabe schließt du
            den dreistufigen Workflow ab.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Die <strong>Inhalte aller Aufgaben</strong> werden gesperrt (Tab „Inhalte" wird read-only).</li>
            <li>Die Dashboards bleiben unverändert geprüft.</li>
            <li>Du kannst die Freigabe später jederzeit über „Freigabe aufheben" zurücknehmen.</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Abbrechen
          </Button>
          <Button
            onClick={onConfirm}
            disabled={busy}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Jetzt final freigeben
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}