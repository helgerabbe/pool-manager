import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import FarbWahl from './FarbWahl';
import Umschalter from './Umschalter';
import { SCHRIFTEN } from '@/lib/folienStil';

/** Inhalt, Größe, Schrift und Farbe für Überschrift und Text. */
export default function TextEinstellungen({ el, setze }) {
  const ue = el.typ === 'ueberschrift';
  return (
    <>
      <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground">Inhalt</p>
        <Textarea rows={ue ? 2 : 4} value={el.inhalt} onChange={(e) => setze({ inhalt: e.target.value })} /></div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Größe{ue ? `: Stufe ${el.stufe + 1} von 4` : ''}</p>
        {ue ? <Slider min={0} max={3} step={1} value={[el.stufe]} onValueChange={([v]) => setze({ stufe: v })} />
          : <Slider min={12} max={40} step={2} value={[el.groesse]} onValueChange={([v]) => setze({ groesse: v })} />}
      </div>
      <Umschalter titel="Schrift" wert={el.schrift} setze={(v) => setze({ schrift: v })} optionen={SCHRIFTEN} />
      <FarbWahl wert={el.farbe} setze={(v) => setze({ farbe: v })} />
    </>
  );
}