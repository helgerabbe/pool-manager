import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import GrobPhase from './GrobPhase';
import DidaktischesModell from './DidaktischesModell';
import InternetVertiefenButton from './InternetVertiefenButton';
import { GROBENTWURF } from '@/lib/stundenplanerVorschauDaten';

const IMPULSE = ['Mehr Schüleraktivität', 'Wirkt mir zu rezeptiv', 'Woher bekomme ich das Material?'];

/** Schritt 4: Grobverlauf mit Eingriffsmöglichkeit. */
export default function Grobentwurf({ onWeiter }) {
  const summe = GROBENTWURF.reduce((a, p) => a + p.minuten, 0);
  return (
    <div className="space-y-4">
      <DidaktischesModell />
      <p className="text-xs text-muted-foreground">Grober Ablauf · {summe} von 40 Min.</p>
      <ol className="space-y-2">{GROBENTWURF.map((p, i) => <GrobPhase key={i} phase={p} nr={i + 1} />)}</ol>
      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
        <p className="text-sm font-medium">Was möchtest du ändern?</p>
        <div className="flex flex-wrap gap-2">
          {IMPULSE.map((t) => <Button key={t} size="sm" variant="outline">{t}</Button>)}
        </div>
        <Textarea rows={2} placeholder="Oder in eigenen Worten …" />
        <InternetVertiefenButton text="Im Internet vertiefend nach Ideen suchen und einbauen" />
      </div>
      <Button onClick={onWeiter}>Passt – jetzt genau planen</Button>
    </div>
  );
}