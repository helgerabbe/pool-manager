import React from 'react';
import { BookOpen, Sparkles, ListTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { BEISPIEL_VERLAUF, WEITERE_STUNDEN } from '@/lib/stundenplanerPrototypDaten';

const karte = (aktiv) => `w-full rounded-xl border p-4 text-left transition-all ${aktiv ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/40'}`;

/** Schritt 1: Stunde wählen, Zeit und Pause einstellen. */
export default function ProtoStart({ wahl, setWahl, minuten, setMinuten, pause, setPause, onWeiter }) {
  const [andere, setAndere] = React.useState(false);
  const Eintrag = ({ s, k, nr }) => (
    <button className={karte(wahl === k)} onClick={() => setWahl(k)}>
      <div className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" /> {nr}. {s.titel}</div>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">{s.lernziel}</p>
    </button>
  );
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Welche Stunde möchtest du planen?</p>
      <div className="space-y-2">
        {BEISPIEL_VERLAUF.map((s, i) => <Eintrag key={i} s={s} k={`v${i}`} nr={i + 1} />)}
        <button className={karte(andere)} onClick={() => setAndere(!andere)}>
          <div className="flex items-center gap-2 text-sm font-semibold"><ListTree className="h-4 w-4 text-primary" /> Andere Stunde aus dem Einheitenverlauf</div>
        </button>
        {andere && <div className="space-y-2 pl-4">{WEITERE_STUNDEN.map((s, i) => <Eintrag key={i} s={s} k={`w${i}`} nr={i + 4} />)}</div>}
        <button className={karte(wahl === 'frei')} onClick={() => setWahl('frei')}>
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-accent" /> Freie Stunde planen</div>
          <p className="mt-1 pl-6 text-xs text-muted-foreground">Unabhängig vom Einheitenverlauf.</p>
        </button>
      </div>
      {wahl !== null && (
        <div className="space-y-3 rounded-xl bg-muted/40 p-4">
          <div className="flex justify-between text-sm"><span>Verfügbare Zeit</span><span className="font-semibold">{minuten} Min.</span></div>
          <Slider min={20} max={95} step={5} value={[minuten]} onValueChange={([v]) => setMinuten(v)} />
          {minuten > 45 && (
            <label className="flex items-center gap-2 text-sm"><Switch checked={pause} onCheckedChange={setPause} /> 5 Minuten Pause einplanen</label>
          )}
        </div>
      )}
      <Button disabled={wahl === null} onClick={onWeiter}>Weiter</Button>
    </div>
  );
}