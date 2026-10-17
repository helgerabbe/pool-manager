import React from 'react';
import { X, Plus, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GEWICHTE } from '@/lib/kiGrobplanung';

const FARBE = { unverzichtbar: 'border-l-destructive', wichtig: 'border-l-accent', beachten: 'border-l-muted-foreground' };

/** Didaktisch-methodische Vorgaben: Lehrkraft gewichtet, streicht, ergänzt – dann wird die Stunde gebaut. */
export default function VorgabenListe({ punkte, setPunkte, laedt, onBauen }) {
  const [neu, setNeu] = React.useState('');
  const aendern = (i, w) => setPunkte(punkte.map((p, j) => (j === i ? { ...p, ...w } : p)));
  const hinzu = () => { if (!neu.trim()) return; setPunkte([...punkte, { text: neu.trim(), gewicht: 'wichtig' }]); setNeu(''); };
  return (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Wenn ich dir gleich die Stunde baue, achte ich auf diese Punkte. Passt das so? Du kannst gewichten, streichen oder etwas ergänzen.</p>
      </div>
      {punkte.map((p, i) => (
        <div key={i} className={`flex items-center gap-2 rounded-lg border border-l-4 bg-card p-2 ${FARBE[p.gewicht]}`}>
          <p className="flex-1 text-sm">{p.text}</p>
          <select value={p.gewicht} onChange={(e) => aendern(i, { gewicht: e.target.value })} className="rounded-md border bg-card px-2 py-1 text-xs">
            {Object.entries(GEWICHTE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
          <button onClick={() => setPunkte(punkte.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={neu} onChange={(e) => setNeu(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && hinzu()} placeholder="Weiteren Punkt ergänzen …" />
        <Button variant="outline" onClick={hinzu}><Plus /></Button>
      </div>
      <Button onClick={onBauen} disabled={laedt || !punkte.length}>
        {laedt ? <Loader2 className="animate-spin" /> : <ArrowRight />} Okay, bau mir die Stunde
      </Button>
    </div>
  );
}