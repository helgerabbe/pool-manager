import React from 'react';
import { STUFEN } from '@/lib/methodenStufen';

/** Filter der Galerie nach Stufe des Methodenrasters. */
export default function StufenFilter({ stufe, setStufe }) {
  return (
    <div className="flex flex-wrap gap-1">
      <button onClick={() => setStufe(null)} className={`rounded px-2 py-0.5 text-xs ${!stufe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Alle</button>
      {Object.entries(STUFEN).map(([k, v]) => (
        <button key={k} title={v.name} onClick={() => setStufe(Number(k))}
          className={`rounded px-2 py-0.5 text-xs ${stufe === Number(k) ? 'bg-primary text-primary-foreground' : v.cls}`}>{k}</button>
      ))}
    </div>
  );
}