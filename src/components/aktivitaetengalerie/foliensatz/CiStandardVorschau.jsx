import React, { useState } from 'react';
import { CI_GRUND, CI_FOLIENTYPEN } from '@/lib/folienCI';
import { CI_STANDARDFOLIEN, CI_STANDARD_REGEL } from '@/lib/folienCIStandard';
import CiStandardBild from './CiStandardBild';

/** Vorschau Teil 15: Standardfolien für häufige Situationen, Schüler- und Lehreransicht. */
export default function CiStandardVorschau() {
  const [art, setArt] = useState('partner');
  const f = CI_STANDARDFOLIEN[art];
  const flaeche = (ansicht, titel, text) => (
    <div className="space-y-1">
      <p className="text-xs font-semibold">{titel}</p>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-card p-4 ring-1 ring-border" style={{ color: CI_GRUND.text }}>
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full" style={{ background: CI_FOLIENTYPEN[f.folientyp].farbe }} />
        <div className="relative w-full flex justify-center"><CiStandardBild art={art} ansicht={ansicht} /></div>
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex flex-wrap gap-2">
        {Object.entries(CI_STANDARDFOLIEN).map(([k, v]) => (
          <button key={k} onClick={() => setArt(k)} className={`rounded-full border px-3 py-1 text-xs ${k === art ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{v.name}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {flaeche('schueler', 'Schüler (iPad)', f.schueler)}
        {flaeche('lehrer', 'Lehrkraft (Tafel / Lehrergerät)', f.lehrer)}
      </div>
      <p className="text-xs text-muted-foreground">{CI_STANDARD_REGEL}</p>
    </div>
  );
}