import React from 'react';
import { Users } from 'lucide-react';
import { EINSATZ_STUFEN, EINSATZ_PROBE } from '@/lib/methodenEinsatz';

/** Einsatzempfehlung: fünfstufige Leiste mit hervorgehobener Stufe und Begründung. */
export default function EinsatzEmpfehlung({ name }) {
  const e = EINSATZ_PROBE[name];
  if (!e) return null;
  const s = EINSATZ_STUFEN[e.stufe];
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" /> Einsatzempfehlung</div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(EINSATZ_STUFEN).map(([k, v]) => (
          <span key={k} title={v.text} className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(k) === e.stufe ? v.cls + ' ring-2 ring-primary' : 'bg-muted text-muted-foreground opacity-60'}`}>{v.label}</span>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{s.text}</p>
      <p className="rounded-lg bg-muted/50 p-3 text-sm">{e.begruendung}</p>
    </div>
  );
}