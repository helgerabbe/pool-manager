import React from 'react';
import { Button } from '@/components/ui/button';
import BausteinZeile from './BausteinZeile';

/** Vorschläge des Assistenten als Entwurf: einzeln oder alle übernehmen bzw. verwerfen. */
export default function VorschlagsBereich({ vorschlaege, kopf, onEntscheiden, onAlle, ersetzen, onErsetzen }) {
  if (!vorschlaege?.length) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display font-bold">Vorschlag des Assistenten</p>
        <label className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={ersetzen} onChange={(e) => onErsetzen(e.target.checked)} /> Bisherigen Ablauf ersetzen</label>
        <Button size="sm" onClick={() => onAlle(true)}>Alle übernehmen</Button>
        <Button size="sm" variant="ghost" onClick={() => onAlle(false)}>Verwerfen</Button>
      </div>
      {vorschlaege.map((b, i) => <BausteinZeile key={b.id} b={b} nr={i + 1} kopf={kopf} vorschlag onUebernehmen={(ja) => onEntscheiden(b.id, ja)} />)}
    </div>
  );
}