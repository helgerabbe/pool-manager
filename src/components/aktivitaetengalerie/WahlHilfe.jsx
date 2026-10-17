import React from 'react';
import { ChevronDown, Scale } from 'lucide-react';
import { KONZEPTION_WAHL } from '@/lib/konzeptionWahl';
import VariantenKriterien from './VariantenKriterien';

/** Aufklappbare Zusatzinfo: Wann nehme ich welche Variante? */
export default function WahlHilfe({ titel }) {
  const eintraege = KONZEPTION_WAHL[titel];
  if (titel !== 'Erarbeitung' && !eintraege) return null;
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold">
        <Scale className="h-4 w-4 text-primary" /> Wann nehme ich welche Variante?
        <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">
        {titel === 'Erarbeitung' ? <VariantenKriterien /> : (
          <ul className="space-y-2 text-sm">
            {eintraege.map(([name, wann]) => <li key={name}><strong>{name}:</strong> <span className="text-muted-foreground">{wann}</span></li>)}
          </ul>
        )}
      </div>
    </details>
  );
}