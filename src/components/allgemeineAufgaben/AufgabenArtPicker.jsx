/**
 * AufgabenArtPicker.jsx
 *
 * Einmaliger 3-Wege-Picker beim Klick auf "+ Neue Aufgabe" (Ebene 2).
 * Ersetzt die alte zweistufige Auswahl (AufgabenModusPicker → AufgabenTypPicker).
 *
 * Drei Aufgabentypen:
 * 1. Handlungsaufgabe       – physische Aufgabe ohne KI-Tutor-Kontext
 * 2. KI-Tutor-Aufgabe       – digitale Einzelaufgabe mit vollem Brian-Support
 * 3. Aufgabensequenz        – mehrschrittige KI-Tutor-Abfolge (Material ⇄ Aufgabe)
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, FileText, ListOrdered } from 'lucide-react';

const ARTEN = [
  {
    value: 'handlung',
    label: 'Handlungsaufgabe',
    description:
      'Schüler arbeiten mit physischem Material – offline, in der Realität. Kein KI-Tutor nötig, kein Erwartungshorizont. Nur: wo findet man das Material?',
    icon: Package,
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    hover: 'hover:border-emerald-400 hover:bg-emerald-100/80',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-700',
    text: 'text-emerald-900',
  },
  {
    value: 'inhalt',
    label: 'KI-Tutor-Aufgabe',
    description:
      'Digitale Einzelaufgabe. Brian.study kennt die Inhalte und kann den Schüler gezielt unterstützen. Mit Lernzielanalyse, Erwartungshorizont und KI-Prompt.',
    icon: FileText,
    border: 'border-blue-200',
    bg: 'bg-blue-50/60',
    hover: 'hover:border-blue-400 hover:bg-blue-100/80',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
    text: 'text-blue-900',
  },
  {
    value: 'sequenz',
    label: 'Aufgabensequenz',
    description:
      'Mehrere Schritte in fester Reihenfolge: Materialien und Aufgaben wechseln sich ab. Ideal für Quellenarbeit in Geschichte, Politik & Co.',
    icon: ListOrdered,
    border: 'border-violet-200',
    bg: 'bg-violet-50/60',
    hover: 'hover:border-violet-400 hover:bg-violet-100/80',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700',
    text: 'text-violet-900',
  },
];

function ArtKachel({ art, onSelect }) {
  const Icon = art.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(art.value)}
      className={`group text-left rounded-xl border-2 ${art.border} ${art.bg} p-5 transition-all ${art.hover} hover:shadow-md hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2`}
    >
      <div className="flex items-start gap-4">
        <div className={`shrink-0 w-12 h-12 rounded-xl ${art.iconBg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${art.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-semibold mb-1.5 ${art.text}`}>{art.label}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{art.description}</p>
        </div>
      </div>
    </button>
  );
}

export default function AufgabenArtPicker({ open, onOpenChange, onSelect }) {
  const handleSelect = (art) => {
    onSelect?.(art);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welche Art von Aufgabe möchten Sie erstellen?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Wählen Sie zwischen einer physischen Handlungsaufgabe, einer digitalen KI-Tutor-Aufgabe oder einer mehrschrittigen Aufgabensequenz.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 mt-2">
          {ARTEN.map((art) => (
            <ArtKachel key={art.value} art={art} onSelect={handleSelect} />
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