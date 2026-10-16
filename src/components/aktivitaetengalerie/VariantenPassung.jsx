import React from 'react';
import { PASSUNG } from '@/lib/stundenModelle';
import { INDUKTIVE_VARIANTEN } from '@/lib/induktiveVarianten';
import { DEDUKTIVE_VARIANTEN } from '@/lib/deduktiveVarianten';
import { VERTIEFTE_VARIANTEN } from '@/lib/vertiefteVarianten';
import { WIEDERHOLUNG_VARIANTEN } from '@/lib/wiederholungVarianten';

const LISTEN = { induktiv: INDUKTIVE_VARIANTEN, deduktiv: DEDUKTIVE_VARIANTEN, vertieft: VERTIEFTE_VARIANTEN, wiederholung: WIEDERHOLUNG_VARIANTEN };

/** Passung je Variante eines Stundenmodells (nur, wenn für die Methode bewertet). */
export default function VariantenPassung({ modellKey, varianten }) {
  const liste = LISTEN[modellKey];
  if (!liste || !varianten) return null;
  return (
    <div className="mt-2 space-y-1 border-l-2 border-primary/20 pl-2">
      {liste.map((v) => {
        const w = varianten[`${modellKey}_${v.key}`];
        if (!w) return null;
        const p = PASSUNG[w[0]];
        return (
          <div key={v.key} className="flex items-start gap-2 text-xs">
            <span className={`w-6 shrink-0 rounded text-center font-semibold ${p.cls}`} title={p.label}>{w[0]}</span>
            <span><strong>{v.name}:</strong> <span className="text-muted-foreground">{w[1]}</span></span>
          </div>
        );
      })}
    </div>
  );
}