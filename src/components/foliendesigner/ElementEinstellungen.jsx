import React from 'react';
import FarbWahl from './einstellungen/FarbWahl';
import { Slider } from '@/components/ui/slider';
import AnimationAuftrag from './einstellungen/AnimationAuftrag';
import Umschalter from './einstellungen/Umschalter';
import TextEinstellungen from './einstellungen/TextEinstellungen';
import FormelEditor from './einstellungen/FormelEditor';
import MedienEinstellungen from './einstellungen/MedienEinstellungen';
import { FOLIEN_ELEMENT } from '@/lib/folienElemente';

const FORMEN = {
  rechteck: ['form', 'Ecken', [['eckig', 'Eckig'], ['rund', 'Abgerundet']]],
  ellipse: ['form', 'Form', [['kreis', 'Kreis'], ['ellipse', 'Ellipse']]],
  dreieck: ['form', 'Form', [['gleich', 'Dreieck'], ['recht', 'Rechtwinklig']]],
  pfeil_duenn: ['spitze', 'Spitze', [['gefuellt', 'Gefüllt'], ['linie', 'Aus Linien']]],
  pfeil_breit: ['fuellung', 'Füllung', [['gefuellt', 'Gefüllt'], ['umriss', 'Nur Umriss']]],
};

/** Rechte Leiste: Einstellungen des gewählten Elements. */
export default function ElementEinstellungen({ el, setze }) {
  const d = FOLIEN_ELEMENT[el.typ];
  const f = FORMEN[el.typ];
  let inhalt = <p className="text-sm text-muted-foreground">Für dieses Element gibt es noch keine Einstellungen.</p>;
  if (el.typ === 'ueberschrift' || el.typ === 'text') inhalt = <TextEinstellungen el={el} setze={setze} />;
  else if (f) inhalt = <><Umschalter titel={f[1]} optionen={f[2]} wert={el[f[0]]} setze={(v) => setze({ [f[0]]: v })} /><FarbWahl wert={el.farbe} setze={(v) => setze({ farbe: v })} /></>;
  else if (el.typ === 'freihand') inhalt = <p className="text-sm text-muted-foreground">Die Freihandform braucht keine Einstellungen.</p>;
  else if (el.typ === 'formel') inhalt = <><FormelEditor teile={el.teile} setze={(teile) => setze({ teile })} />
    <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Größe der Formel</p><Slider min={16} max={64} step={4} value={[el.groesse || 24]} onValueChange={([v]) => setze({ groesse: v })} /></div><FarbWahl wert={el.farbe} setze={(v) => setze({ farbe: v })} /></>;
  else if (el.typ === 'animation_ki' || el.typ === 'animation_interaktiv') inhalt = <AnimationAuftrag el={el} setze={setze} />;
  else if (['bild', 'video', 'audio', 'link'].includes(el.typ)) inhalt = <MedienEinstellungen el={el} setze={setze} />;
  return (
    <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-l border-border bg-card p-4">
      <p className="flex items-center gap-2 font-semibold"><d.icon className="h-4 w-4 text-primary" />{d.label}</p>
      {inhalt}
    </aside>
  );
}