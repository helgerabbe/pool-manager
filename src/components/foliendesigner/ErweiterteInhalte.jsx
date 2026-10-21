import React from 'react';

/** Vorschau: Skala mit mehreren Karten (Zeitstrahl), Venn-Bereiche, Abstimmung in zwei Runden. */
export default function ErweiterteInhalte({ el }) {
  if (el.typ === 'skala') return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-0 top-1/2 h-1 rounded-full bg-muted-foreground/40" />
      {[['10%', '1789'], ['45%', '1848'], ['80%', '1918']].map(([l, t]) => (
        <span key={t} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded border border-primary bg-background px-1.5 text-xs" style={{ left: l }}>{t}</span>
      ))}
    </div>
  );
  if (el.typ === 'kanban') return (
    <div className="relative h-full w-full">
      <div className="absolute left-[5%] top-[5%] h-[90%] w-[55%] rounded-full border-2 border-primary bg-primary/10" />
      <div className="absolute right-[5%] top-[5%] h-[90%] w-[55%] rounded-full border-2 border-accent bg-accent/10" />
      <span className="absolute left-[15%] top-[45%] text-xs">A</span>
      <span className="absolute left-1/2 top-[45%] -translate-x-1/2 text-xs font-semibold">beide</span>
      <span className="absolute right-[15%] top-[45%] text-xs">B</span>
    </div>
  );
  return (
    <div className="w-full space-y-1.5">
      {[['Ja', 'w-1/3', 'w-3/4'], ['Nein', 'w-2/3', 'w-1/4']].map(([l, v, n]) => (
        <div key={l} className="flex items-center gap-2 text-xs"><span className="w-9">{l}</span>
          <div className="flex-1 space-y-0.5"><div className="h-2 rounded-full bg-muted"><div className={`h-full rounded-full bg-muted-foreground/50 ${v}`} /></div>
            <div className="h-2 rounded-full bg-muted"><div className={`h-full rounded-full bg-primary ${n}`} /></div></div></div>
      ))}
      <p className="text-[10px] text-muted-foreground">grau: 1. Runde · blau: 2. Runde</p>
    </div>
  );
}