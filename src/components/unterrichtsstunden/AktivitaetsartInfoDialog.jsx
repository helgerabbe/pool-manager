/**
 * Info-Popup zu einer Aufgabenart (Aktivitäten-Katalog) — gleiche Darstellung
 * wie in der Aktivitäten-Palette des Pool-Managers: "Was ist das?" + Beispiel.
 */
import React from 'react';
import { Info, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AktivitaetsartInfoDialog({ open, onOpenChange, katalogEntry }) {
  if (!katalogEntry) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            {katalogEntry.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Was ist das?</p>
            {katalogEntry.beschreibung ? (
              <p className="text-sm text-foreground leading-relaxed">{katalogEntry.beschreibung}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Noch keine Beschreibung hinterlegt.</p>
            )}
          </div>
          {katalogEntry.beispiel && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-accent" />
                Aufgabenbeispiel
              </p>
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                <p className="text-sm text-amber-950 leading-relaxed whitespace-pre-line">{katalogEntry.beispiel}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}