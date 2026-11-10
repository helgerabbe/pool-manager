import React from 'react';
import { GEWICHTE } from '@/lib/kompetenzkarte';
import SchuelerBereich from './SchuelerBereich';

/** Vorschau: So sieht der Schüler die Kompetenzkarte. Ankreuzen ist möglich, wird aber nicht gespeichert. */
export default function KompetenzkarteSchuelerAnsicht({ karte }) {
  const [wahl, setWahl] = React.useState({});
  const onWahl = (id, i) => setWahl((w) => ({ ...w, [id]: w[id] === i ? undefined : i }));
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <p className="text-sm">{karte.untertitel}</p>
        <h2 className="font-display text-2xl font-bold">{karte.titel}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Kreuze an, wie gut du das schon kannst. So siehst du, was du noch üben solltest.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {GEWICHTE.map((g) => <span key={g.key} className={`rounded-full border px-2 py-0.5 font-semibold ${g.chip}`}>{g.label}</span>)}
      </div>
      {(karte.bereiche || []).map((b) => <SchuelerBereich key={b.id} bereich={b} wahl={wahl} onWahl={onWahl} />)}
    </div>
  );
}