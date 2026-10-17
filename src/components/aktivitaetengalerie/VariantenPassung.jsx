import React from 'react';
import { PASSUNG, BEITRAG } from '@/lib/stundenModelle';
import { INDUKTIVE_VARIANTEN, VARIANTEN_PHASEN } from '@/lib/induktiveVarianten';
import { DEDUKTIVE_VARIANTEN } from '@/lib/deduktiveVarianten';
import { VERTIEFTE_VARIANTEN } from '@/lib/vertiefteVarianten';
import { WIEDERHOLUNG_VARIANTEN } from '@/lib/wiederholungVarianten';
import { URTEIL_VARIANTEN } from '@/lib/urteilVarianten';
import { ERSCHLIESSUNG_VARIANTEN } from '@/lib/erschliessungVarianten';
import { GESTALTUNG_VARIANTEN } from '@/lib/gestaltungVarianten';
import { EINSTIEG_VARIANTEN } from '@/lib/einstiegVarianten';
import { PRAESENTATION_VARIANTEN } from '@/lib/praesentationVarianten';
import { variantenBeitraege } from '@/lib/variantenPhasenZuordnung';

export const VARIANTEN_LISTEN = { induktiv: INDUKTIVE_VARIANTEN, deduktiv: DEDUKTIVE_VARIANTEN, vertieft: VERTIEFTE_VARIANTEN, wiederholung: WIEDERHOLUNG_VARIANTEN, urteil: URTEIL_VARIANTEN, erschliessung: ERSCHLIESSUNG_VARIANTEN, gestaltung: GESTALTUNG_VARIANTEN, einstieg: EINSTIEG_VARIANTEN, praesentation: PRAESENTATION_VARIANTEN };

export const BEITRAG_CLS = { kern: 'bg-primary text-primary-foreground', teil: 'bg-primary/15 text-primary', bedingt: 'border border-dashed border-primary/50 text-primary' };

/** Variantenzeilen: eigene Phasen der Variante, markiert über die Zuordnung zum Grundgerüst. */
export default function VariantenPassung({ modell, eintrag, varianten }) {
  const liste = VARIANTEN_LISTEN[modell.key];
  if (!liste || !varianten) return null;
  return liste.map((v) => {
    const w = varianten[`${modell.key}_${v.key}`];
    if (!w) return null;
    const p = PASSUNG[w[0]];
    const phasen = v.phasen || VARIANTEN_PHASEN[v.key] || [];
    const beitraege = variantenBeitraege(modell, v.key, phasen.length, eintrag);
    return (
      <div key={v.key} className="grid grid-cols-[185px_150px_1fr] gap-3">
        <span className="text-xs font-medium">{v.name}</span>
        <span className={`h-fit rounded-md px-2 py-1 text-center text-xs font-semibold ${p.cls}`}>{w[0]} · {p.label}</span>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {phasen.map((ph, i) => (
              <span key={ph} title={beitraege[i] ? BEITRAG[beitraege[i]] : 'nicht abgedeckt'}
                className={`rounded px-1.5 py-0.5 text-xs ${beitraege[i] ? BEITRAG_CLS[beitraege[i]] : 'bg-muted text-muted-foreground/60'}`}>{ph}</span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{w[1]}</p>
        </div>
      </div>
    );
  });
}