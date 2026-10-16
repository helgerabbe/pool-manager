import React from 'react';
import { Sparkles } from 'lucide-react';
import { INDUKTIVE_VARIANTEN } from '@/lib/induktiveVarianten';

/** Auswahl der Variante induktiver Erarbeitung; die KI-Empfehlung ist markiert. */
export default function InduktivVarianten({ wert, setWert, empfehlung, begruendung }) {
  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-4">
      <p className="text-sm font-semibold">Wie entdeckend soll es sein?</p>
      {begruendung && <p className="text-xs text-muted-foreground">{begruendung}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {INDUKTIVE_VARIANTEN.map((v) => (
          <button key={v.key} onClick={() => setWert(v.key)}
            className={`rounded-xl border bg-card p-3 text-left transition-all ${wert === v.key ? 'border-primary shadow-sm ring-1 ring-primary' : 'hover:border-primary/40'}`}>
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
              {v.name}
              {empfehlung === v.key && <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent"><Sparkles className="h-3 w-3" /> Empfohlen</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{v.kurz}</p>
          </button>
        ))}
      </div>
    </div>
  );
}