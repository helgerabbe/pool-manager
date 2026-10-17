import React from 'react';
import { Slider } from '@/components/ui/slider';

const Regler = ({ titel, links, rechts, wert, setWert }) => (
  <div className="space-y-3 rounded-xl border bg-card p-4">
    <p className="text-sm font-semibold">{titel}</p>
    <Slider min={1} max={5} step={1} value={[wert]} onValueChange={([v]) => setWert(v)} />
    <div className="flex justify-between text-xs text-muted-foreground"><span>{links}</span><span>{rechts}</span></div>
  </div>
);

/** Lerngruppe: Standard ist eine normale Klasse, genauer über zwei Regler. */
export default function LerngruppeEditor({ gruppe, setGruppe }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Ohne Angabe plane ich für eine ganz normale Klasse: mittleres Arbeitstempo, normale Selbstständigkeit.</p>
      <Regler titel="Wie ist das Arbeitstempo der Klasse?" links="Eher langsam" rechts="Eher schnell" wert={gruppe.fit} setWert={(v) => setGruppe((g) => ({ ...g, fit: v }))} />
      <Regler titel="Wie selbstständig arbeitet die Klasse?" links="Braucht viel Anleitung" rechts="Sehr selbstständig" wert={gruppe.stark} setWert={(v) => setGruppe((g) => ({ ...g, stark: v }))} />
      <button className="text-xs text-primary underline" onClick={() => setGruppe({ fit: 3, stark: 3 })}>Auf normale Lerngruppe zurücksetzen</button>
    </div>
  );
}