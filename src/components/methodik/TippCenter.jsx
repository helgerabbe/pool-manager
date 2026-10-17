import React from 'react';
import { Lightbulb, Loader2, ChevronDown, MessageCircle, Sparkles, Shuffle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ARTEN = {
  inspiration: { name: 'Inspiration', icon: Sparkles, farbe: 'border-l-accent bg-accent/5 text-accent' },
  alternative: { name: 'Alternative', icon: Shuffle, farbe: 'border-l-chart-4 bg-chart-4/5 text-chart-4' },
  tipp: { name: 'Tipp', icon: Lightbulb, farbe: 'border-l-chart-3 bg-chart-3/5 text-chart-3' },
};

/** Aufklappbares Tipp-Center: Hinweise zur Passung plus Inspirationen, Alternativen und Tipps. */
export default function TippCenter({ pruefung, onLaden, onBesprechen }) {
  const [offen, setOffen] = React.useState(false);
  const [tipps, setTipps] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);
  const laden = () => { setLaedt(true); onLaden().then(setTipps).finally(() => setLaedt(false)); };
  const umschalten = () => { setOffen(!offen); if (!offen && !tipps && !laedt) laden(); };
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={umschalten} className="flex w-full items-center gap-2 p-4 text-left">
        <Lightbulb className="h-5 w-5 text-accent" />
        <span className="flex-1 text-sm font-semibold">Tipp-Center: Hinweise, Inspirationen und Alternativen</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && (
        <div className="space-y-3 border-t p-4">
          {pruefung}
          {laedt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich sammle Ideen …</p>}
          {tipps?.map((t, i) => {
            const a = ARTEN[t.art] || ARTEN.tipp;
            return (
              <div key={i} className={`space-y-2 rounded-lg border-l-4 p-3 ${a.farbe}`}>
                <p className="flex items-center gap-1 text-xs font-semibold"><a.icon className="h-3.5 w-3.5" /> {a.name}</p>
                <p className="text-sm text-foreground">{t.text}</p>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onBesprechen(t)}><MessageCircle /> Darüber sprechen</Button>
              </div>
            );
          })}
          {tipps && !laedt && <Button size="sm" variant="outline" onClick={laden}><RefreshCw /> Neue Ideen</Button>}
        </div>
      )}
    </div>
  );
}