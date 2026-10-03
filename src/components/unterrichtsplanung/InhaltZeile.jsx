import React from 'react';
import { cn } from '@/lib/utils';

const STUFEN = [
  { wert: 'muss', label: 'Muss rein', aktiv: 'bg-primary text-primary-foreground border-primary' },
  { wert: 'vielleicht', label: 'Vielleicht', aktiv: 'bg-accent text-accent-foreground border-accent' },
  { wert: 'raus', label: 'Raus', aktiv: 'bg-muted text-muted-foreground border-border' },
];

export default function InhaltZeile({ inhalt, onPrioritaet }) {
  return (
    <div className={cn('flex flex-wrap items-start gap-3 rounded-lg border p-3', inhalt.prioritaet === 'raus' && 'opacity-50')}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{inhalt.titel}</span>
          {inhalt.empfohlen && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Kern</span>}
          {inhalt.minuten > 0 && <span className="text-[11px] text-muted-foreground">ca. {inhalt.minuten} Min.</span>}
        </div>
        <p className="text-xs text-foreground/80">{inhalt.beschreibung}</p>
        {inhalt.begruendung && <p className="text-[11px] text-muted-foreground">{inhalt.begruendung}</p>}
      </div>
      <div className="flex shrink-0 gap-1">
        {STUFEN.map((s) => (
          <button
            key={s.wert}
            type="button"
            onClick={() => onPrioritaet(s.wert)}
            className={cn('rounded-md border px-2 py-1 text-xs', inhalt.prioritaet === s.wert ? s.aktiv : 'hover:bg-muted')}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}