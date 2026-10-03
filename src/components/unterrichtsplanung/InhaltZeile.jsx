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
          {inhalt.kc && <span title={inhalt.kc_bezug || 'Vorgabe des Kerncurriculums'} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">KC-Inhalt</span>}
          {inhalt.empfohlen && !inhalt.kc && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Empfohlen</span>}
          {inhalt.kc && inhalt.prioritaet === 'raus' && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">Bewusst gegen KC-Vorgabe entschieden</span>}
          {inhalt.minuten > 0 && <span className="text-[11px] text-muted-foreground">ca. {inhalt.minuten} Min.</span>}
        </div>
        <p className="text-xs text-foreground/80">{inhalt.beschreibung}</p>
        {inhalt.kc && inhalt.kc_bezug && <p className="text-[11px] font-medium text-primary">KC: {inhalt.kc_bezug}</p>}
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