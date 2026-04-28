/**
 * AufgabenTypPicker.jsx
 *
 * Modaler Picker (2 Kacheln): vorgeschaltet vor "+ Neue Aufgabe" in Tab 5
 * (Ebene 2). Wählt den aufgaben_typ ('inhalt' = Brian-Aufgabe, 'handlung' =
 * Handlungsaufgabe mit physischem Material) und übergibt ihn als
 * Initial-State an AufgabeCreateView.
 *
 * Wird in Ebene 3 NICHT angezeigt – dort wird aufgaben_typ automatisch auf
 * 'inhalt' gesetzt (siehe AllgemeineAufgabenView).
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AUFGABEN_TYPEN, AUFGABEN_TYPEN_ORDER } from '@/lib/aufgabenTypen';

function TypKachel({ typ, onSelect }) {
  const Icon = typ.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(typ.value)}
      className={`group text-left rounded-xl border-2 ${typ.color.border}/30 ${typ.color.bg}/40 p-4 transition-all ${typ.color.hover} hover:shadow-md hover:scale-[1.01] focus:outline-none focus:ring-2 ${typ.color.ring} focus:ring-offset-2`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-11 h-11 rounded-lg ${typ.color.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${typ.color.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${typ.color.text} mb-1`}>{typ.label}</h3>
          <p className="text-xs text-foreground/70 leading-relaxed">{typ.description}</p>
        </div>
      </div>
    </button>
  );
}

export default function AufgabenTypPicker({ open, onOpenChange, onSelect }) {
  const handleSelect = (typValue) => {
    onSelect?.(typValue);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welche Art von Aufgabe möchten Sie erstellen?</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Brauchen die Schüler dafür physisches Material in der Realität? Dann „Handlungsaufgabe". Sonst „Brian-Aufgabe" (rein digital).
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {AUFGABEN_TYPEN_ORDER.map((key) => (
            <TypKachel key={key} typ={AUFGABEN_TYPEN[key]} onSelect={handleSelect} />
          ))}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Abbrechen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}