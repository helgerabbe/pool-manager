import React from 'react';
import { Scale } from 'lucide-react';
import { KRITERIEN, FAUSTREGELN } from '@/lib/variantenKriterien';

const Liste = ({ titel, items }) => (
  <div className="space-y-1">
    <p className="text-sm font-semibold">{titel}</p>
    <ul className="space-y-1 text-sm text-muted-foreground">{items.map((f) => <li key={f}>• {f}</li>)}</ul>
  </div>
);

/** Wann welche Variante? Entscheidungskriterien für induktive und deduktive Erarbeitung. */
export default function VariantenKriterien() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <h3 className="flex items-center gap-2 font-semibold"><Scale className="h-4 w-4 text-primary" /> Wann welche Variante?</h3>
      <ol className="space-y-2 text-sm">
        {KRITERIEN.map((k, i) => (
          <li key={k.titel}><strong>{i + 1}. {k.titel}.</strong> <span className="text-muted-foreground">{k.text}</span></li>
        ))}
      </ol>
      <div className="grid gap-4 md:grid-cols-2">
        <Liste titel="Induktiv" items={FAUSTREGELN.induktiv} />
        <Liste titel="Deduktiv" items={FAUSTREGELN.deduktiv} />
      </div>
      <p className="rounded-lg bg-muted/40 p-3 text-sm"><strong>Zur Erkenntnistiefe:</strong> {FAUSTREGELN.tiefe}</p>
    </div>
  );
}