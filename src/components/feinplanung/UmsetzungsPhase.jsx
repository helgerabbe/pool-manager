import React from 'react';
import { Sparkles } from 'lucide-react';
import { UMSETZUNGEN } from '@/lib/kiUmsetzung';
import { istFreieMethode } from '@/lib/freieMethode';

/** Eine Phase mit Wahl analog / digital / gemischt. */
export default function UmsetzungsPhase({ phase, nr, onWahl }) {
  const frei = istFreieMethode(phase);
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-semibold">{nr}. {phase.name}{phase.minuten ? <span className="font-normal text-muted-foreground"> · {phase.minuten} Min.</span> : null}</p>
      {phase.methode && <p className="text-xs"><span className="font-medium">Methode:</span> {phase.methode}</p>}
      {phase.schueler && <p className="text-xs text-muted-foreground">{phase.schueler}</p>}
      {frei && <p className="text-xs text-muted-foreground">Die Freie Methode läuft immer analog, mit Arbeitsauftrag und/oder Material.</p>}
      <div className="grid grid-cols-3 gap-1.5">
        {UMSETZUNGEN.map((u) => (
          <button key={u.key} disabled={frei && u.key !== 'analog'} onClick={() => onWahl(u.key)}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium disabled:opacity-40 ${phase.umsetzung === u.key ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
            {u.name}
          </button>
        ))}
      </div>
      {phase.umsetzung_begruendung && (
        <p className="flex gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />{phase.umsetzung_begruendung}</p>
      )}
    </div>
  );
}