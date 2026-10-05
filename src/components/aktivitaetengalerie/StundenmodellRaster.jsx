import React from 'react';
import { STUNDEN_MODELLE, PASSUNG, BEITRAG } from '@/lib/stundenModelle';

const BEITRAG_CLS = { kern: 'bg-primary text-primary-foreground', teil: 'bg-primary/15 text-primary', bedingt: 'border border-dashed border-primary/50 text-primary' };

/** Raster: Passung je Stundenmodell + abgedeckte Phasen. */
export default function StundenmodellRaster({ einordnung }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">In welchen Stundenmodellen passt sie, und welche Phasen deckt sie ab?</p>
      <div className="overflow-hidden rounded-xl border">
        {STUNDEN_MODELLE.map((m) => {
          const e = einordnung[m.key] || { passung: 5, phasen: {} };
          const p = PASSUNG[e.passung];
          return (
            <div key={m.key} className="grid grid-cols-[200px_150px_1fr] gap-3 border-b p-3 last:border-b-0 text-sm">
              <span className="font-semibold">{m.name}</span>
              <span className={`h-fit rounded-md px-2 py-1 text-center text-xs font-semibold ${p.cls}`}>{e.passung} · {p.label}</span>
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {m.phasen.map((ph) => {
                    const b = e.phasen[ph];
                    return (
                      <span key={ph} title={b ? BEITRAG[b] : 'nicht abgedeckt'}
                        className={`rounded px-1.5 py-0.5 text-xs ${b ? BEITRAG_CLS[b] : 'bg-muted text-muted-foreground/60'}`}>{ph}</span>
                    );
                  })}
                </div>
                {e.hinweis && <p className="text-xs text-muted-foreground">{e.hinweis}</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(BEITRAG).map(([k, l]) => <span key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${BEITRAG_CLS[k]}`} />{l}</span>)}
      </div>
    </div>
  );
}