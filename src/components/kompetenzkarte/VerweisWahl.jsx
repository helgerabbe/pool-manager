import React from 'react';
import { Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

/** Auswahl der Lernpakete und Aufgaben, mit denen der Schüler eine Kompetenz lernt. */
export default function VerweisWahl({ gewaehlt = [], verweise, onChange }) {
  const ids = new Set(gewaehlt.map((v) => v.id));
  const umschalten = (v) => onChange(ids.has(v.id) ? gewaehlt.filter((x) => x.id !== v.id) : [...gewaehlt, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded border border-dashed px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted">
          <Link2 className="h-3 w-3" /> Lernen mit …
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-80 overflow-y-auto p-2">
        {!verweise.length && <p className="p-2 text-xs text-muted-foreground">Im Dashboard liegen noch keine Lernpakete oder Aufgaben.</p>}
        {verweise.map((v) => (
          <label key={v.id} className={`flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-xs hover:bg-muted ${v.art === 'aktivitaet' ? 'pl-7' : 'font-semibold'}`}>
            <Checkbox checked={ids.has(v.id)} onCheckedChange={() => umschalten(v)} className="mt-0.5" />
            <span>{v.art === 'lernpaket' ? 'Lernpaket: ' : ''}{v.titel}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}