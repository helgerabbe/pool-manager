import React from 'react';

/** Vorschau-Varianten: Markieren im Bild, Auswahl mit Begründung, Abstimmung mit Punktebudget. */
export default function ZusatzInhalte({ el }) {
  if (el.typ === 'markieren') return (
    <div className="relative h-full w-full rounded-md border border-border bg-muted">
      <span className="absolute left-[20%] top-[25%] h-8 w-8 rounded-full border-2 border-accent" />
      <span className="absolute left-[65%] top-[55%] h-8 w-8 rounded-full border-2 border-accent" />
      <span className="absolute bottom-1 right-2 text-xs text-muted-foreground">Fehler im Bild markieren</span>
    </div>
  );
  if (el.typ === 'auswahl') return (
    <div className="w-full space-y-1.5">
      {['Antwort A', 'Antwort B'].map((a, i) => <div key={a} className={`rounded-md border px-2 py-1 text-sm ${i === 0 ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>{a}</div>)}
      <div className="rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground">Begründung: Weil …</div>
    </div>
  );
  return (
    <div className="w-full space-y-1.5">
      <p className="text-xs text-muted-foreground">Verteile deine {el.budget} Punkte</p>
      {[['Idee A', 3], ['Idee B', 1]].map(([l, n]) => <div key={l} className="flex items-center gap-2 text-sm"><span className="w-14">{l}</span>{Array.from({ length: n }).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-primary" />)}</div>)}
    </div>
  );
}