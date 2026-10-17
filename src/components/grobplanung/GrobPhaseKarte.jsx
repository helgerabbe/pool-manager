import React from 'react';
import { Presentation, Users, Sparkles, Clock } from 'lucide-react';
import MethodeBadge from '@/components/methodik/MethodeBadge';

/** Eine Phase des Grobentwurfs: Lehrkraft (blau) und Schüler (orange) nebeneinander, ohne Zeitangabe. */
export default function GrobPhaseKarte({ phase, nr, zeit, children }) {
  return (
    <div className={`space-y-3 rounded-xl border p-4 ${phase.neu ? 'border-accent/60 bg-accent/5' : 'bg-card'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{nr}</span>
        <p className="text-sm font-semibold">{phase.name}</p>
        {zeit && <span className="inline-flex items-center gap-1 rounded-full bg-chart-3/15 px-2 py-0.5 text-[11px] font-medium text-chart-3"><Clock className="h-3 w-3" /> {zeit}</span>}
        {phase.sozialform && <span className="rounded-full bg-chart-4/15 px-2 py-0.5 text-[11px] font-medium text-chart-4">{phase.sozialform}</span>}
        {phase.methode && <MethodeBadge name={phase.methode} />}
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
      {(phase.details || phase.achten || phase.grenzen || children) && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-primary">Mehr dazu</summary>
          <div className="mt-2 space-y-2">
            {[['Warum so?', phase.details], ['Worauf achten?', phase.achten], ['Wann eher nicht?', phase.grenzen]].filter(([, t]) => t).map(([t, x]) => (
              <p key={t}><span className="font-semibold text-foreground">{t}</span> {x}</p>
            ))}
            {children}
          </div>
        </details>
      )}
    </div>
  );
}