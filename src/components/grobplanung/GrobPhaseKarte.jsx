import React from 'react';
import { Presentation, Users, Sparkles } from 'lucide-react';

/** Eine Phase des Grobentwurfs: Lehrkraft (blau) und Schüler (orange) nebeneinander, ohne Zeitangabe. */
export default function GrobPhaseKarte({ phase, nr }) {
  return (
    <div className={`space-y-3 rounded-xl border p-4 ${phase.neu ? 'border-accent/60 bg-accent/5' : 'bg-card'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{nr}</span>
        <p className="text-sm font-semibold">{phase.name}</p>
        {phase.sozialform && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{phase.sozialform}</span>}
        {phase.methode && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{phase.methode}</span>}
        {phase.neu && <span className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground"><Sparkles className="h-3 w-3" /> verändert</span>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-primary"><Presentation className="h-3.5 w-3.5" /> Lehrkraft</p>
          <p className="mt-1 text-sm">{phase.lehrer}</p>
        </div>
        <div className="rounded-lg border-l-4 border-l-accent bg-accent/10 p-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-accent"><Users className="h-3.5 w-3.5" /> Schüler</p>
          <p className="mt-1 text-sm">{phase.schueler}</p>
        </div>
      </div>
      {phase.details && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-primary">Mehr dazu</summary>
          <p className="mt-1">{phase.details}</p>
        </details>
      )}
    </div>
  );
}