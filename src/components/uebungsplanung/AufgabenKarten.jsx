import React from 'react';
import { X } from 'lucide-react';

const EINSATZ = { stunde: 'In der Stunde', hausaufgabe: 'Hausaufgabe', uebungszeit: 'Übungszeit' };

/** Liste der vorgeschlagenen bzw. vereinbarten Aufgaben, einzeln entfernbar. */
export default function AufgabenKarten({ titel, aufgaben = [], onEntfernen }) {
  if (!aufgaben.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{titel}</p>
      {aufgaben.map((x, i) => (
        <div key={i} className="rounded-xl border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">
              {x.niveau && <span className="mr-2 text-accent" title={x.niveau === 2 ? 'Für Leistungsstarke' : 'Für alle'}>{x.niveau === 2 ? '★★' : '★'}</span>}
              {x.titel}
              {x.niveau && <span className="ml-2 text-[11px] font-normal text-muted-foreground">{x.niveau === 2 ? 'für Leistungsstarke' : 'für alle'}</span>}
            </p>
            <div className="flex items-center gap-2">
              {x.einsatz && <span className="text-[11px] text-muted-foreground">{EINSATZ[x.einsatz] || x.einsatz}</span>}
              {onEntfernen && <button onClick={() => onEntfernen(i)}><X className="h-4 w-4 text-muted-foreground" /></button>}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{x.beschreibung}</p>
          {x.beispiel && <p className="mt-1 rounded-lg bg-muted px-2 py-1 text-xs">Beispiel: {x.beispiel}</p>}
        </div>
      ))}
    </div>
  );
}