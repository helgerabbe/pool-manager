import React from 'react';
import { FACHBEZUG, METHODEN_FAECHER } from '@/lib/methodenFachbezug';

/** Fachbezug einer Methode wählen, bei fachgebunden/Fächergruppe zusätzlich die Fächer. */
export default function FachbezugAuswahl({ werte, setze }) {
  const faecher = werte.faecher || [];
  const umschalten = (f) => setze('faecher', faecher.includes(f) ? faecher.filter((x) => x !== f) : [...faecher, f]);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Fachbezug</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(FACHBEZUG).map(([k, v]) => (
          <button key={k} onClick={() => setze('fachbezug', k)}
            className={`rounded-md px-3 py-1 text-sm ${werte.fachbezug === k ? 'bg-primary text-primary-foreground' : v.cls}`}>{v.name}</button>
        ))}
      </div>
      {werte.fachbezug && werte.fachbezug !== 'uebergreifend' && (
        <div className="flex flex-wrap gap-1">
          {METHODEN_FAECHER.map((f) => (
            <button key={f} onClick={() => umschalten(f)}
              className={`rounded px-2 py-0.5 text-xs ${faecher.includes(f) ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{f}</button>
          ))}
        </div>
      )}
    </div>
  );
}