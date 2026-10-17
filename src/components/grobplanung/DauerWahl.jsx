import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

/** Gesamtdauer der Stunde (Standard: Einzelstunde) und optionale Pause. */
export default function DauerWahl({ minuten, setMinuten, pause, setPause }) {
  const offen = minuten === null;
  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-4">
      <div className="flex justify-between text-sm"><span>Wie lang ist die Stunde?</span><span className="font-semibold">{offen ? 'Ergibt sich aus der Planung' : `${minuten} Min.`}</span></div>
      <div className="flex flex-wrap gap-2">
        {[45, 90, null].map((m) => (
          <button key={String(m)} onClick={() => setMinuten(m)} className={`rounded-full border px-3 py-1 text-xs ${minuten === m ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}>
            {m === 45 ? 'Einzelstunde' : m === 90 ? 'Doppelstunde' : 'Ergibt sich aus der Planung'}
          </button>
        ))}
      </div>
      {offen
        ? <p className="text-xs text-muted-foreground">Kein Problem: Der Assistent schlägt vor, ob das Vorhaben in eine Einzel- oder Doppelstunde passt.</p>
        : <Slider min={20} max={95} step={5} value={[minuten]} onValueChange={([v]) => setMinuten(v)} />}
      {!offen && minuten > 45 && <label className="flex items-center gap-2 text-sm"><Switch checked={pause} onCheckedChange={setPause} /> 5 Minuten Pause einplanen</label>}
    </div>
  );
}