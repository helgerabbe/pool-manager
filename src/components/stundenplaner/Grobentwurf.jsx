import React from 'react';
import { Globe, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrobPhase from './GrobPhase';
import DidaktischesModell from './DidaktischesModell';
import FreitextMitSprache from './FreitextMitSprache';

const IMPULSE = ['Mehr Schüleraktivität', 'Wirkt mir zu rezeptiv', 'Woher bekomme ich das Material?'];

/** Schritt 4: KI-Grobverlauf mit Eingriffsmöglichkeit. */
export default function Grobentwurf({ entwurf, laedt, ziel, onAendern, onWeiter }) {
  const [wunsch, setWunsch] = React.useState('');
  if (!entwurf) {
    return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich entwerfe den Ablauf …</p>;
  }
  const summe = (entwurf.phasen || []).reduce((a, p) => a + (p.minuten || 0), 0);
  const senden = (text, internet = false) => { onAendern(text, internet); setWunsch(''); };
  return (
    <div className="space-y-4">
      <DidaktischesModell modell={entwurf.modell} />
      <p className="text-xs text-muted-foreground">Grober Ablauf · {summe} von {ziel} Min.</p>
      <ol className="space-y-2">{(entwurf.phasen || []).map((p, i) => <GrobPhase key={i} phase={p} nr={i + 1} />)}</ol>
      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
        <p className="text-sm font-medium">Was möchtest du ändern?</p>
        <div className="flex flex-wrap gap-2">
          {IMPULSE.map((t) => <Button key={t} size="sm" variant="outline" disabled={laedt} onClick={() => senden(t)}>{t}</Button>)}
        </div>
        <FreitextMitSprache value={wunsch} onChange={setWunsch} placeholder="Oder in eigenen Worten …" />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" disabled={laedt || !wunsch.trim()} onClick={() => senden(wunsch)}>
            {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Änderung einarbeiten
          </Button>
          <Button size="sm" variant="outline" className="gap-2" disabled={laedt} onClick={() => senden(wunsch, true)}>
            <Globe className="h-4 w-4" /> Im Internet vertiefend nach Ideen suchen und einbauen
          </Button>
        </div>
      </div>
      <Button disabled={laedt} onClick={onWeiter}>Passt – jetzt genau planen</Button>
    </div>
  );
}