import React from 'react';
import { Check, Flag, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { aufgabenAmPlatz } from '@/lib/lernpaketAufgaben';
import { istVollstaendig } from './LernpaketAufgabenGruppe';

const SYMBOL = { einstieg: Compass, gesamtaufgabe: Flag };

/** Eintrag im Menübaum für einen festen Platz des Themenfelds, mit Zähler wie beim Lernpaket. */
export default function ThemenfeldPlatzKnoten({ platz, themenfeld, selectedItem, onSelect, alleAufgaben = [] }) {
  const Symbol = SYMBOL[platz.key];
  const gewaehlt = (selectedItem?.type === 'themenfeld_platz' || (selectedItem?.type === 'aufgabe' && !!selectedItem.platz))
    && selectedItem.platz.key === platz.key
    && selectedItem.themenfeld.id === themenfeld.id;
  const aufgaben = aufgabenAmPlatz(alleAufgaben, themenfeld.id, platz.key);
  const freigegeben = aufgaben.length > 0 && aufgaben.every((a) => a.content_status === 'approved');
  const pille = freigegeben ? 'bg-green-700 text-white ring-2 ring-green-300'
    : aufgaben.length === 0 ? 'bg-slate-200 text-slate-700'
    : aufgaben.every(istVollstaendig) ? 'bg-green-500 text-white'
    : 'bg-orange-500 text-white';
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
      <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0', pille)}>
        {freigegeben ? <Check className="w-3.5 h-3.5" /> : aufgaben.length}
      </div>
    </button>
  );
}