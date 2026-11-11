import React from 'react';
import { Flag, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const SYMBOL = { einstieg: Compass, gesamtaufgabe: Flag };

/** Eintrag im Menübaum für einen festen Platz des Themenfelds. */
export default function ThemenfeldPlatzKnoten({ platz, themenfeld, selectedItem, onSelect }) {
  const Symbol = SYMBOL[platz.key];
  const gewaehlt = selectedItem?.type === 'themenfeld_platz'
    && selectedItem.platz.key === platz.key
    && selectedItem.themenfeld.id === themenfeld.id;
  return (
    <button
      type="button"
      onClick={() => onSelect({ type: 'themenfeld_platz', platz, themenfeld })}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-medium transition-colors',
        gewaehlt ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
      )}
    >
      <span className="w-3.5 shrink-0" />
      <Symbol className={cn('w-4 h-4 shrink-0', gewaehlt ? 'text-primary-foreground' : 'text-primary')} />
      <span className="flex-1 truncate">{platz.titel}</span>
    </button>
  );
}