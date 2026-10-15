import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { BEISPIEL_VERLAUF } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 1: Stunde aus dem Einheitenverlauf oder frei planen, Zeit einstellen. */
export default function ProtoStart({ wahl, setWahl, minuten, setMinuten, onWeiter }) {
  const karte = (aktiv) => `w-full rounded-xl border p-4 text-left transition-all ${aktiv ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40'}`;
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Welche Stunde möchtest du planen?</p>
      <div className="space-y-2">
        {BEISPIEL_VERLAUF.map((s, i) => (
          <button key={i} className={karte(wahl === i)} onClick={() => setWahl(i)}>
            <div className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" /> {i + 1}. {s.titel}</div>
            <p className="mt-1 pl-6 text-xs text-muted-foreground">{s.lernziel}</p>
          </button>
        ))}
        <button className={karte(wahl === 'frei')} onClick={() => setWahl('frei')}>
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Freie Stunde planen</div>
          <p className="mt-1 pl-6 text-xs text-muted-foreground">Unabhängig vom Einheitenverlauf.</p>
        </button>
      </div>
      {wahl !== null && (
        <div className="space-y-3 rounded-xl bg-muted/40 p-4">
          <div className="flex justify-between text-sm"><span>Verfügbare Zeit</span><span className="font-semibold">{minuten} Min.</span></div>
          <Slider min={20} max={90} step={5} value={[minuten]} onValueChange={([v]) => setMinuten(v)} />
        </div>
      )}
      <Button disabled={wahl === null} onClick={onWeiter}>Weiter</Button>
    </div>
  );
}