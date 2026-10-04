import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SCHWERPUNKTE = {
  erarbeitung: { label: 'Erarbeitung', farbe: 'bg-primary/10 text-primary' },
  uebung: { label: 'Übung', farbe: 'bg-chart-3/15 text-chart-3' },
  vertiefung: { label: 'Vertiefte Übung', farbe: 'bg-bundle-soft text-bundle' },
  sicherung: { label: 'Sicherung', farbe: 'bg-accent/15 text-accent' },
  ueberpruefung: { label: 'Überprüfung', farbe: 'bg-destructive/10 text-destructive' },
};

/** Ein Abschnitt des Verlaufs, zugeklappt: Nummer, Titel, Schwerpunkt. `kopfZusatz`/`children` für Zeitplanung o. Ä. */
export default function VerlaufAbschnitt({ abschnitt: s, index, kopfZusatz, children, gedimmt }) {
  const [offen, setOffen] = useState(false);
  const sp = SCHWERPUNKTE[s.schwerpunkt];
  return (
    <li className={cn('rounded-lg border', gedimmt && 'opacity-50')}>
      <button type="button" onClick={() => setOffen(!offen)} className="flex w-full flex-wrap items-center gap-2 p-3 text-left">
        <span className="text-sm font-bold text-muted-foreground">{index + 1}.</span>
        <span className="text-sm font-semibold">{s.titel}</span>
        {sp && <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', sp.farbe)}>{sp.label}</span>}
        <span className="ml-auto flex items-center gap-2">
          {kopfZusatz}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', offen && 'rotate-180')} />
        </span>
      </button>
      {offen && (
        <div className="space-y-1 border-t px-3 pb-3 pt-2">
          <p className="text-xs text-foreground/80">{s.lernziel}</p>
          <p className="text-xs text-muted-foreground">{s.vorschlag}</p>
          {children}
        </div>
      )}
    </li>
  );
}