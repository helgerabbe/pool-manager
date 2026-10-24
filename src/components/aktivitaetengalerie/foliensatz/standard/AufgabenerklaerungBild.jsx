import React from 'react';
import { Eye, Presentation } from 'lucide-react';
import { CI_SYMBOL_STIL } from '@/lib/folienCI';

const gross = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

/** Aufgabenerklärung: Tafel zeigt die Aufgabe, das Tablet holt den Blick nach vorne. */
export default function AufgabenerklaerungBild({ ansicht }) {
  if (ansicht === 'lehrer') return (
    <div className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#7FA6D6] bg-white/70">
      <p className="text-sm font-bold text-[#7FA6D6]">Hier steht die Aufgabe</p>
    </div>
  );
  return (
    <div className="flex flex-col items-center gap-2 text-center text-xs">
      <div className="flex gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={gross}><Presentation className="h-6 w-6" /></span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={gross}><Eye className="h-6 w-6" /></span>
      </div>
      <p>Deine Lehrkraft erklärt dir gerade die Aufgabe.<br />Bitte schau nach vorne.</p>
    </div>
  );
}