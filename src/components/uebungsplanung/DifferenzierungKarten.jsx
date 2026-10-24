import React from 'react';

const STUFEN = [
  ['foerder', 'Förderangebot', 'Minimum mit Hilfen', 'border-chart-3/40 bg-chart-3/5'],
  ['normal', 'Normal', 'für alle', 'border-primary/30 bg-primary/5'],
  ['stark', 'Leistungsstärker', 'eine Stufe mehr', 'border-accent/40 bg-accent/5'],
];

/** Je Kernaufgabe die drei Niveaus nebeneinander. */
export default function DifferenzierungKarten({ kern = [] }) {
  if (!kern.some((k) => k.niveaus)) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Differenzierung</p>
      {kern.map((k, i) => k.niveaus && (
        <div key={i} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Kernaufgabe {i + 1}: {k.titel}</p>
          <div className="grid gap-2 md:grid-cols-3">
            {STUFEN.map(([key, name, zusatz, farbe]) => (
              <div key={key} className={`rounded-xl border p-3 ${farbe}`}>
                <p className="text-sm font-semibold">{name} <span className="text-[11px] font-normal text-muted-foreground">{zusatz}</span></p>
                <p className="text-sm text-muted-foreground">{k.niveaus[key]?.beschreibung}</p>
                {k.niveaus[key]?.beispiel && <p className="mt-1 rounded-lg bg-card px-2 py-1 text-xs">Beispiel: {k.niveaus[key].beispiel}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}