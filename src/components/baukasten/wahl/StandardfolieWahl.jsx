import React from 'react';
import { STANDARD_FOLIEN } from '@/lib/standardFolienBibliothek';
import { EINSATZ, FOLIEN_EINSATZ } from '@/lib/standardFolienEinsatz';
import FolieAnzeige from '@/components/aktivitaetengalerie/foliensatz/FolieAnzeige';

const alsFolie = (s) => (s.ci
  ? { vorlage: 'standard', standard: s.key, folientyp: s.folientyp, titel: s.titel?.[0] || s.name }
  : { ...s.folie });

/** Standardfolien nach Einsatz-Kategorie gruppiert. */
export default function StandardfolieWahl({ onWahl }) {
  const gruppen = {};
  STANDARD_FOLIEN.forEach((s) => { const k = FOLIEN_EINSATZ[s.key]; (gruppen[k] = gruppen[k] || []).push(s); });
  return (
    <div className="space-y-6">
      {Object.entries(gruppen).map(([k, liste]) => (
        <div key={k}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-chart-4">{EINSATZ[k]?.name || 'Weitere'}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {liste.map((s) => {
              const folie = alsFolie(s);
              return (
                <button key={s.key} onClick={() => onWahl({ titel: s.name, folien: [{ ...folie, id: `${s.key}${Date.now()}` }] })} className="group text-left">
                  <div className="aspect-video overflow-hidden rounded-md border bg-card group-hover:ring-2 group-hover:ring-chart-4/50">
                    <div className="pointer-events-none origin-top-left scale-[0.23] w-[435%]"><FolieAnzeige folie={folie} /></div>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium">{s.name}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}