/**
 * VersionConflictDialog.jsx
 * ──────────────────────────
 * Zeigt sich, wenn ein Speichern mit HTTP 409 / Versionskonflikt fehlschlägt
 * (Optimistic Locking). Lässt den Nutzer zwischen "neu laden" (sicher) und
 * "trotzdem überschreiben" (nur mit passender RBAC-Rolle) wählen.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

export default function VersionConflictDialog({
  open,
  onOpenChange,
  onDiscardAndReload,
  onForceOverwrite,          // optional – nur wenn Backend das unterstützt
  canForceOverwrite = false, // RBAC-Entscheidung vom Aufrufer
  isProcessing = false,
  conflictDetails = null,    // optional: z.B. { updatedBy, updatedAt }
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 pt-0.5">
              <DialogTitle>Versionskonflikt erkannt</DialogTitle>
              <DialogDescription className="mt-2">
                Ein anderer Nutzer hat in der Zwischenzeit Änderungen gespeichert.
                Deine aktuelle Version ist veraltet.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {conflictDetails && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            {conflictDetails.updatedBy && (
              <p>
                Zuletzt gespeichert von <strong className="text-foreground">{conflictDetails.updatedBy}</strong>
              </p>
            )}
            {conflictDetails.updatedAt && (
              <p>
                Zeitpunkt:{' '}
                <strong className="text-foreground">
                  {new Date(conflictDetails.updatedAt).toLocaleString('de-DE')}
                </strong>
              </p>
            )}
          </div>
        )}

        {canForceOverwrite && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Als <strong>Fachschaftsleitung</strong> kannst du trotzdem überschreiben.
              Änderungen des anderen Nutzers gehen dabei unwiderruflich verloren.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onDiscardAndReload}
            disabled={isProcessing}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Eigene Änderungen verwerfen &amp; neu laden
          </Button>

          {canForceOverwrite && onForceOverwrite && (
            <Button
              variant="destructive"
              onClick={onForceOverwrite}
              disabled={isProcessing}
              className="gap-2"
            >
              <ShieldAlert className="w-4 h-4" />
              Trotzdem überschreiben
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}