import React from 'react';
import { CI_GRUND, CI_GRUPPEN, CI_GRUPPEN_REGEL } from '@/lib/folienCI';

/** Vorschau Teil 12: Gruppenkennung (Farbe + Buchstabe). */
export default function CiGruppenVorschau() {
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex flex-wrap gap-4">
        {CI_GRUPPEN.map((g) => (
          <div key={g.kennung} className="flex flex-col items-center gap-1 text-xs">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold" style={{ background: g.hg, color: g.text }}>{g.kennung}</span>
            {g.name}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{CI_GRUPPEN_REGEL}</p>
    </div>
  );
}