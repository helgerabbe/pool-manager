import React from 'react';
import { Users } from 'lucide-react';
import { CI_GRUND, CI_GRUPPEN, CI_GRUPPEN_REGEL, CI_PARTNER } from '@/lib/folienCI';

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
      <p className="pt-2 text-sm font-semibold">Partnerteams</p>
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 12].map((n) => (
          <span key={n} className="flex h-8 items-center gap-1 rounded-full border bg-white px-2 text-xs font-bold" style={{ borderColor: CI_PARTNER.rand, color: CI_PARTNER.text }}>
            <Users className="h-3.5 w-3.5" />{CI_PARTNER.praefix}{n}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{CI_PARTNER.regel}</p>
    </div>
  );
}