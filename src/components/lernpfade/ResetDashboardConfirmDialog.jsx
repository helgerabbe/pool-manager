/**
 * ResetDashboardConfirmDialog.jsx
 *
 * Sicherheitsabfrage für den „Auf Standard zurücksetzen"-Button im
 * Didaktischen Guide. Da neue Einheiten ihre Dashboards seit dem
 * Default-Templates-Rollout (April 2026) bereits vorbefüllt bekommen,
 * überschreibt ein Reset NICHT mehr ein leeres Dashboard, sondern
 * potenziell schon vorgenommene Zuweisungen der Lehrkraft.
 *
 * Die Komponente kapselt nur die UI; die eigentliche Reset-Logik liegt
 * weiterhin im Cockpit (`useDashboardRelease.handleApplyTemplate`).
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';

export default function ResetDashboardConfirmDialog({
  open,
  onOpenChange,
  lerntypLabel,
  busy = false,
  onConfirm,
}) {
  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Auf Standard zurücksetzen?
          </DialogTitle>
          <DialogDescription>
            Möchtest du das Dashboard <strong>„{lerntypLabel}"</strong> wirklich
            auf das Standard-Raster zurücksetzen?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <p className="font-medium mb-1">⚠️ Achtung – Daten gehen verloren</p>
          <p className="text-xs leading-relaxed">
            Alle bisher in diesem Dashboard zugewiesenen Aufgaben sowie deine
            individuellen Sektor-Anpassungen werden entfernt und durch die
            didaktische Standard-Vorlage ersetzt. Andere Dashboards
            (Lerntypen) bleiben unangetastet.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={busy}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={busy}
            className="gap-1.5"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            Zurücksetzen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}