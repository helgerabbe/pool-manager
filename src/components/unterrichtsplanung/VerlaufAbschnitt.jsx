import React from 'react';
import { Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';

const GEWICHTE = [
  { wert: 'weniger', label: 'Weniger wichtig', aktiv: 'bg-muted text-foreground border-foreground/30' },
  { wert: 'passt', label: 'Passt so', aktiv: 'bg-primary/10 text-primary border-primary' },
  { wert: 'wichtiger', label: 'Mehr Zeit', aktiv: 'bg-primary text-primary-foreground border-primary' },
];

/** Ein Abschnitt des Verlaufs: Zeitvorschlag, Gewichtung, ggf. Übungsempfehlung. */
export default function VerlaufAbschnitt({ abschnitt: s, index, onGewichtung }) {
  const gewicht = s.gewichtung || 'passt';
  const zeit = s.minuten || (s.art === 'doppel' ? 85 : 40);
  return (
    <li className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
            <span className="text-sm font-semibold">{s.titel}</span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-primary">
            Geplante Zeit: {zeit} Min.{s.zeit_text ? ` · ${s.zeit_text}` : ''}
          </p>
          <p className="text-xs text-foreground/80">{s.lernziel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.vorschlag}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {GEWICHTE.map((g) => (
            <button
              key={g.wert}
              type="button"
              onClick={() => onGewichtung(g.wert)}
              className={cn('rounded-md border px-2 py-1 text-xs', gewicht === g.wert ? g.aktiv : 'hover:bg-muted')}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      {s.uebung_empfohlen && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-bundle-border bg-bundle-soft p-2 text-xs">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-bundle text-bundle-foreground">
            <Boxes className="h-3 w-3" />
          </span>
          <span><span className="font-semibold">Hier wäre eine Übung gut:</span> {s.uebung_hinweis}</span>
        </div>
      )}
    </li>
  );
}