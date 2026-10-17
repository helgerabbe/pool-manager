import React from 'react';

/** Kompakte Liste der Phasen eines Entwurfs für den Vorher-Nachher-Vergleich. */
export default function PhasenSpalte({ titel, phasen, betont }) {
  return (
    <div className={`space-y-2 rounded-xl border p-3 ${betont ? 'border-chart-3/50 bg-chart-3/5' : 'bg-muted/40'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titel}</p>
      {phasen.map((p, i) => (
        <div key={i} className="rounded-lg bg-card p-2 text-sm">
          <p className="font-medium">{i + 1}. {p.name}</p>
          <p className="text-xs text-muted-foreground">{p.schueler || p.aktivitaet}</p>
        </div>
      ))}
    </div>
  );
}