/**
 * EinheitFreigabeConfirmDialog.jsx
 *
 * Bestätigungsdialog vor der finalen Einheits-Freigabe (Schritt 3).
 *
 * Phase B: Der Dialog kann ZWEI Zustände annehmen:
 *   1) Standard-Bestätigung — wenn keine Live-Edits aktiv sind.
 *   2) Hard-Block — wenn der Pre-Flight aktive Bearbeiter findet (oder die
 *      Backend-Function 409 mit code='ACTIVE_LOCKS' antwortet). In diesem
 *      Fall zeigt der Dialog die Liste der Bearbeiter, der primäre
 *      „Freigeben"-Button verschwindet, und die Fachschaftsleitung sieht nur
 *      „Erneut prüfen" + „Abbrechen".
 */

import React from 'react';
import { Loader2, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ActiveLocksList from '@/components/lernpfade/ActiveLocksList';

export default function EinheitFreigabeConfirmDialog({
  open,
  onOpenChange,
  busy = false,
  preflightBusy = false,
  activeLocks = [],
  onConfirm,
  onRecheck,
}) {
  const blocked = Array.isArray(activeLocks) && activeLocks.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {blocked ? (
              <Lock className="w-5 h-5 text-amber-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            )}
            {blocked ? 'Freigabe noch nicht möglich' : 'Einheit final freigeben'}
          </DialogTitle>
        </DialogHeader>

        {blocked ? (
          <div className="space-y-3 text-sm leading-snug">
            <p>
              Die Einheit kann nicht final freigegeben werden, solange noch Personen aktiv
              bearbeiten. Bitte warte, bis die Bearbeitungen beendet sind, oder bitte die
              betroffenen Personen, ihre Sitzung zu schließen.
            </p>
            <ActiveLocksList locks={activeLocks} />
            <p className="text-xs text-muted-foreground">
              Mit „Erneut prüfen" wird der Status der Bearbeitungs-Sperren neu geladen.
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm leading-snug">
            <p>
              Alle vier Lerntyp-Dashboards sind geprüft und es ist niemand mehr in
              Bearbeitung. Mit der finalen Freigabe schließt du den Workflow ab und
              übergibst die Einheit an das Moodle-Team.
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                Die <strong>gesamte Einheit wird gesperrt</strong> – alle Tabs und
                Dashboards werden read-only, es kann nichts mehr verändert werden.
              </li>
              <li>
                Die Einheit wird an das <strong>Moodle-Team</strong> übergeben, das sie
                in Moodle und Brian integriert.
              </li>
              <li>
                Du kannst die Freigabe später über „Freigabe aufheben" zurücknehmen –
                solange das Export-Team noch nicht „Export starten" geklickt hat.
              </li>
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy || preflightBusy}
          >
            Abbrechen
          </Button>
          {blocked ? (
            <Button
              onClick={onRecheck}
              disabled={preflightBusy}
              className="gap-1.5"
            >
              {preflightBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Erneut prüfen
            </Button>
          ) : (
            <Button
              onClick={onConfirm}
              disabled={busy || preflightBusy}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Jetzt final freigeben
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}