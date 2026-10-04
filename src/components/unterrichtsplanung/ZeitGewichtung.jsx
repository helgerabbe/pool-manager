import React from 'react';
import { cn } from '@/lib/utils';

const GEWICHTE = [
  { wert: 'weniger', label: 'Weniger Zeit', aktiv: 'bg-muted text-foreground border-foreground/30' },
  { wert: 'passt', label: 'Passt so', aktiv: 'bg-primary/10 text-primary border-primary' },
  { wert: 'wichtiger', label: 'Mehr Zeit', aktiv: 'bg-primary text-primary-foreground border-primary' },
  { wert: 'raus', label: 'Streichen', aktiv: 'bg-destructive text-destructive-foreground border-destructive' },
];

/** Zeitwunsch für einen Abschnitt in der Zeitplanung. */
export default function ZeitGewichtung({ wert = 'passt', onChange }) {
  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {GEWICHTE.map((g) => (
        <button
          key={g.wert}
          type="button"
          onClick={() => onChange(g.wert)}
          className={cn('rounded-md border px-2 py-1 text-xs', wert === g.wert ? g.aktiv : 'hover:bg-muted')}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}