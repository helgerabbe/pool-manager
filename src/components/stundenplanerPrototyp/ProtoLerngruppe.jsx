import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const Regler = ({ titel, links, rechts, wert, setWert }) => (
  <div className="space-y-3 rounded-xl border bg-card p-4">
    <p className="text-sm font-semibold">{titel}</p>
    <Slider min={1} max={5} step={1} value={[wert]} onValueChange={([v]) => setWert(v)} />
    <div className="flex justify-between text-xs text-muted-foreground"><span>{links}</span><span>{rechts}</span></div>
  </div>
);

/** Schritt 4: Lerngruppe – bewusst nur zwei einfache Regler. */
export default function ProtoLerngruppe({ gruppe, setGruppe, onWeiter }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Wie schätzt du die Klasse ein, wenn du diese Stunde hältst? Ein Bauchgefühl reicht.</p>
      <Regler titel="Wie fit ist die Klasse in dieser Stunde?" links="Erschöpft, unruhig" rechts="Wach, konzentriert"
        wert={gruppe.fit} setWert={(v) => setGruppe({ ...gruppe, fit: v })} />
      <Regler titel="Wie leistungsstark ist die Lerngruppe?" links="Braucht viel Unterstützung" rechts="Sehr selbstständig"
        wert={gruppe.stark} setWert={(v) => setGruppe({ ...gruppe, stark: v })} />
      <Button onClick={onWeiter}>Ersten Entwurf erstellen</Button>
    </div>
  );
}