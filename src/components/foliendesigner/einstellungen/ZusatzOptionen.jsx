import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Umschalter from './Umschalter';

/** Zusatzoptionen einzelner Elemente: Markieren im Bild, Auswahl mit Begründung, Punktebudget. */
export default function ZusatzOptionen({ el, setze }) {
  if (el.typ === 'markieren') return (
    <Umschalter titel="Markiert wird im" optionen={[['text', 'Text'], ['bild', 'Bild']]} wert={el.ziel || 'text'} setze={(v) => setze({ ziel: v })} />
  );
  if (el.typ === 'auswahl') return (
    <label className="flex items-start justify-between gap-3">
      <span><span className="block text-sm font-medium">Mit Begründung</span><span className="block text-xs text-muted-foreground">Zur Auswahl muss eine kurze Begründung geschrieben werden (z. B. Odd One Out).</span></span>
      <Switch checked={!!el.begruendung} onCheckedChange={(v) => setze({ begruendung: v })} />
    </label>
  );
  if (el.typ === 'abstimmung') {
    const budget = el.budget || 1;
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Punkte je Schüler: {budget === 1 ? '1 (einfache Abstimmung)' : `${budget} (Punktabfrage)`}</p>
        <Slider min={1} max={5} step={1} value={[budget]} onValueChange={([v]) => setze({ budget: v })} />
      </div>
    );
  }
  return null;
}