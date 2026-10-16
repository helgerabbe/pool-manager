import React from 'react';
import { TIPP_ARTEN } from '@/lib/tippArten';

/** Kleine Legende: welche Farbe steht für welche Eingriffstiefe. */
export default function TippLegende() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
      {Object.entries(TIPP_ARTEN).map(([k, a]) => (
        <span key={k} className="inline-flex items-center gap-1" title={a.erklaerung}><a.Icon className={`h-3.5 w-3.5 ${a.icon}`} /> {a.name}</span>
      ))}
    </div>
  );
}