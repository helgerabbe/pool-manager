import React from 'react';
import { X, Star } from 'lucide-react';

const NIVEAU = { 0: ['Förderangebot', 'für schwache Schüler'], 1: ['★', 'für alle'], 2: ['★★', 'für Leistungsstarke'] };

/** Liste der vorgeschlagenen bzw. vereinbarten Aufgaben, einzeln entfernbar und optional mit 1-5 Sternen bewertbar. */
export default function AufgabenKarten({ titel, aufgaben = [], onEntfernen, onBewerten }) {
  if (!aufgaben.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{titel}</p>
      {aufgaben.map((x, i) => {
        const n = x.foerder ? NIVEAU[0] : NIVEAU[x.niveau];
        return (
          <div key={i} className="rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">
                {n && <span className={`mr-2 ${x.foerder ? 'rounded bg-chart-3/15 px-1.5 py-0.5 text-[11px] text-chart-3' : 'text-accent'}`}>{n[0]}</span>}
                {x.titel}
                {n && !x.foerder && <span className="ml-2 text-[11px] font-normal text-muted-foreground">{n[1]}</span>}
              </p>
              <div className="flex items-center gap-2">
                {onBewerten && (
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} title={`${s} von 5`} onClick={() => onBewerten(i, x.bewertung === s ? 0 : s)}>
                        <Star className={`h-4 w-4 ${s <= (x.bewertung || 0) ? 'fill-accent text-accent' : 'text-muted-foreground/40'}`} />
                      </button>
                    ))}
                  </div>
                )}
                {onEntfernen && <button onClick={() => onEntfernen(i)}><X className="h-4 w-4 text-muted-foreground" /></button>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{x.beschreibung}</p>
            {x.beispiel && <p className="mt-1 rounded-lg bg-muted px-2 py-1 text-xs">Beispiel: {x.beispiel}</p>}
          </div>
        );
      })}
    </div>
  );
}