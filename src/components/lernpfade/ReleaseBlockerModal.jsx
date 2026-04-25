/**
 * ReleaseBlockerModal.jsx
 *
 * Wird beim Klick auf "Lernpfad prüfen & freigeben" geöffnet, wenn der
 * Pre-Flight Check mindestens ein gelbes oder rotes Item findet.
 *
 * Listet die blockierenden Aufgaben mit Titel, Sektor, Ampel-Badge und
 * Quick-Fix-Button (öffnet AufgabeCreateView, identisch zum Klick auf das
 * Badge im Sektor).
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
import { AlertCircle, AlertTriangle, PenLine } from 'lucide-react';
import { AMPEL, getAmpelLabel } from '@/lib/ampelLogic';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';

function BlockerRow({ entry, onOpenEditor }) {
  const { aufgabe, status, sektorTitel, sektorIndex } = entry;
  const typMeta = getAufgabenTyp(aufgabe?.aufgaben_typ);
  const TypIcon = typMeta.icon;
  const StatusIcon = status === AMPEL.YELLOW ? AlertTriangle : AlertCircle;
  const statusCls = status === AMPEL.YELLOW ? 'text-amber-600' : 'text-red-600';

  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-card p-2.5">
      <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${statusCls}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TypIcon className={`w-3 h-3 ${typMeta.color.iconText}`} />
          <span className="text-sm font-medium text-foreground truncate">
            {aufgabe?.titel || 'Ohne Titel'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {sektorTitel ? `Sektor ${sektorIndex + 1}: ${sektorTitel}` : `Sektor ${sektorIndex + 1}`}
          {' · '}
          <span className={statusCls}>{getAmpelLabel(status)}</span>
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onOpenEditor?.(aufgabe)}
        className="gap-1.5 h-7 text-xs shrink-0"
      >
        <PenLine className="w-3 h-3" /> Bearbeiten
      </Button>
    </li>
  );
}

export default function ReleaseBlockerModal({
  open,
  onOpenChange,
  blockers = [],
  lerntypLabel,
  onOpenEditor,
}) {
  const yellowCount = blockers.filter((b) => b.status === AMPEL.YELLOW).length;
  const redCount = blockers.filter((b) => b.status === AMPEL.RED).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Freigabe blockiert
          </DialogTitle>
          <DialogDescription>
            Der Lernpfad <span className="font-medium">{lerntypLabel}</span> kann noch nicht
            freigegeben werden. Folgende Bausteine benötigen noch Aufmerksamkeit:
          </DialogDescription>
        </DialogHeader>

        <div className="text-xs text-muted-foreground flex items-center gap-3">
          {redCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-red-600" />
              {redCount} unfertig
            </span>
          )}
          {yellowCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              {yellowCount} geändert seit Export
            </span>
          )}
        </div>

        <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {blockers.map((entry, idx) => (
            <BlockerRow
              key={`${entry.aufgabe?.id || 'x'}-${idx}`}
              entry={entry}
              onOpenEditor={onOpenEditor}
            />
          ))}
        </ul>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}