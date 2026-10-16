import React from 'react';
import { PASSUNG } from '@/lib/stundenModelle';
import { INDUKTIVE_VARIANTEN } from '@/lib/induktiveVarianten';
import { DEDUKTIVE_VARIANTEN } from '@/lib/deduktiveVarianten';
import { VERTIEFTE_VARIANTEN } from '@/lib/vertiefteVarianten';
import { WIEDERHOLUNG_VARIANTEN } from '@/lib/wiederholungVarianten';

export const VARIANTEN_LISTEN = { induktiv: INDUKTIVE_VARIANTEN, deduktiv: DEDUKTIVE_VARIANTEN, vertieft: VERTIEFTE_VARIANTEN, wiederholung: WIEDERHOLUNG_VARIANTEN };

/** Variantenzeilen im gleichen Raster wie Übung/Diagnose. */
export default function VariantenPassung({ modellKey, varianten }) {
  const liste = VARIANTEN_LISTEN[modellKey];
  if (!liste || !varianten) return null;
  return liste.map((v) => {
    const w = varianten[`${modellKey}_${v.key}`];
    if (!w) return null;
    const p = PASSUNG[w[0]];
    return (
      <div key={v.key} className="grid grid-cols-[185px_150px_1fr] gap-3">
        <span className="text-xs font-medium">{v.name}</span>
        <span className={`h-fit rounded-md px-2 py-1 text-center text-xs font-semibold ${p.cls}`}>{w[0]} · {p.label}</span>
        <p className="text-xs text-muted-foreground">{w[1]}</p>
      </div>
    );
  });
}