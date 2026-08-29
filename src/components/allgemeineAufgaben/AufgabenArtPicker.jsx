/**
 * AufgabenArtPicker.jsx
 *
 * Der Picker beim Klick auf "+ Neue Aufgabe" (Ebene 2).
 *
 * Drei Wege — die Unterscheidung ist DIDAKTISCH, nicht technisch. Sie sagt
 * der Lehrkraft, wo die Aufgabe stattfindet:
 * 1. Handlungsaufgabe     – am realen Material, offline
 * 2. Externe HTML-Seite   – auf einer fremden Seite (GeoGebra, LearningApps)
 * 3. Digitale Aufgabe     – in der Lernplattform; oeffnet die Aufgaben-Werkstatt
 *
 * Umstellung 2026-08-29: Die frühere vierte Wahl "KI-Tutor-Aufgabe" ist
 * entfallen. Ein Brian-Gespräch ist keine eigene Aufgabenart mehr, sondern
 * ein SCHRITTTYP: Eine Aufgabe, die nur aus einem Brian-Gespräch besteht, ist
 * eine Schrittfolge mit genau einem Schritt — und lässt sich jederzeit um
 * einen Lesetext oder eine Übung davor erweitern, ohne den Typ zu wechseln.
 *
 * Die Handlungsaufgabe gibt es damit BEWUSST doppelt: hier als eigene Art
 * (Abkürzung für "passiert komplett offline") und in der Werkstatt als
 * Schritttyp (für gemischte Folgen mit einem realen Zwischenschritt). Das ist
 * Absicht, keine Dublette — bitte nicht zusammenlegen.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, ListOrdered, Code2 } from 'lucide-react';

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
    value: 'sequenz',
    label: 'Digitale Aufgabe',
    description:
      'Die Schüler arbeiten in der Lernplattform. In der Werkstatt bauen Sie die Aufgabe aus Schritten — ein Lesetext, eine Übung aus dem Katalog, ein Gespräch mit Brian, eine eingebettete Seite. Auch eine Aufgabe mit nur einem Schritt ist völlig in Ordnung.',
    icon: ListOrdered,
    border: 'border-violet-200',
    bg: 'bg-violet-50/60',
    hover: 'hover:border-violet-400 hover:bg-violet-100/80',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700',
    text: 'text-violet-900',
  },
  {
    value: 'externe_html_seite',
    label: 'Externe HTML-Seite',
    description:
      'Bette eine interaktive HTML-Seite ein (z.B. GeoGebra, LearningApps). Die externe Seite steuert die Didaktik; die App wartet auf die Erledigt-Bestätigung.',
    icon: Code2,
    border: 'border-teal-200',
    bg: 'bg-teal-50/60',
    hover: 'hover:border-teal-400 hover:bg-teal-100/80',
    iconBg: 'bg-teal-100',
    iconText: 'text-teal-700',
    text: 'text-teal-900',
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
            Die Frage ist vor allem: Wo lösen die Schüler diese Aufgabe?
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