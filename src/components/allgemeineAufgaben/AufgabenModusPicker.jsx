/**
 * AufgabenModusPicker.jsx
 *
 * Vorgeschaltet vor "+ Neue Aufgabe" in Ebene 2: Wahl zwischen
 * "Einzelaufgabe" (bisheriges Verhalten) und "Aufgabensequenz"
 * (mehrschrittige Aufgabe mit Material + Aufgaben in fester Reihenfolge).
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ListOrdered } from 'lucide-react';

const MODI = [
  {
    value: 'einzeln',
    label: 'Einzelaufgabe',
    description: 'Eine Aufgabe mit einem Material. Wie bisher – eine Aufgabenstellung, ein Erwartungshorizont, ein KI-Tutor.',
    icon: FileText,
    color: 'border-slate-200 bg-white hover:border-primary/50 hover:bg-primary/5',
    iconColor: 'text-primary bg-primary/10',
  },
  {
    value: 'sequenz',
    label: 'Aufgabensequenz',
    description: 'Mehrere Schritte in fester Reihenfolge: Material bereitstellen, dann Aufgaben dazu – Schritt fuer Schritt. Ideal fuer Quellenarbeit in Geschichte, Politik & Co.',
    icon: ListOrdered,
    color: 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400 hover:bg-emerald-100/50',
    iconColor: 'text-emerald-700 bg-emerald-100',
  },
];

function ModusKachel({ modus, onSelect }) {
  const Icon = modus.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(modus.value)}
      className={`group text-left rounded-xl border-2 ${modus.color} p-5 transition-all hover:shadow-md hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
    >
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-12 h-12 rounded-xl ${modus.iconColor} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold mb-1.5">{modus.label}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{modus.description}</p>
        </div>
      </div>
    </button>
  );
}

export default function AufgabenModusPicker({ open, onOpenChange, onSelect }) {
  const handleSelect = (modusValue) => {
    onSelect?.(modusValue);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welche Art von Aufgabe moechten Sie erstellen?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Waehlen Sie zwischen einer klassischen Einzelaufgabe und einer mehrschrittigen Aufgabensequenz.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {MODI.map((modus) => (
            <ModusKachel key={modus.value} modus={modus} onSelect={handleSelect} />
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