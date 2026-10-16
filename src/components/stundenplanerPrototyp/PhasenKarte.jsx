import React from 'react';
import { Sparkles } from 'lucide-react';

/** Eine Phase des Grobentwurfs – Änderungen laufen über die KI, veränderte Phasen farbig markiert. */
export default function PhasenKarte({ phase, children }) {
  return (
    <div className={`flex gap-4 rounded-xl border p-4 ${phase.neu ? 'border-accent/60 bg-accent/5' : 'bg-card'}`}>
      <div className="w-16 shrink-0 text-center">
        <p className="font-display text-xl font-bold text-primary">{phase.minuten}</p>
        <p className="text-[10px] uppercase text-muted-foreground">Min.</p>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold">{phase.name} <span className="font-normal text-muted-foreground">· {phase.sozialform}</span>
          {phase.neu && <span className="ml-2 inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground"><Sparkles className="h-3 w-3" /> verändert</span>}
        </p>
        {phase.deckt?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            Deckt ab: {phase.deckt.map((d) => <span key={d} className="rounded-full px-2 py-0.5 ring-1 ring-border">{d}</span>)}
          </div>
        )}
        <p className="text-sm text-muted-foreground">{phase.aktivitaet}</p>
        {phase.begruendung && <p className="text-xs italic text-muted-foreground">Warum so: {phase.begruendung}</p>}
        {children}
      </div>
    </div>
  );
}