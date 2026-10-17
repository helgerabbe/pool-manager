import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Sparkles } from 'lucide-react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

const Regler = ({ titel, links, rechts, wert, setWert }) => (
  <div className="space-y-3 rounded-xl border bg-card p-4">
    <p className="text-sm font-semibold">{titel}</p>
    <Slider min={1} max={5} step={1} value={[wert]} onValueChange={([v]) => setWert(v)} />
    <div className="flex justify-between text-xs text-muted-foreground"><span>{links}</span><span>{rechts}</span></div>
  </div>
);

/** Lerngruppe: drei Regler (Standard = normale Klasse) plus Lernausgangslage. */
export default function LerngruppeEditor({ gruppe, setGruppe, vorwissen, setVorwissen }) {
  const setz = (key) => (v) => setGruppe((g) => ({ ...g, [key]: v }));
  return (
    <div className="space-y-3">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Das ist wirklich nur eine grobe Einschätzung, du musst hier nichts ganz genau einstellen. Wenn deine Lerngruppe Besonderheiten hat, etwa dass sie besonders langsam arbeitet oder schon ziemlich selbstständig ist, kannst du das hier angeben. Wenn nicht, ist das auch kein Beinbruch: Dann plane ich für eine ganz normale Klasse.</p>
      </div>
      <Regler titel="Wie ist das Arbeitstempo der Klasse?" links="Eher langsam" rechts="Eher schnell" wert={gruppe.fit} setWert={setz('fit')} />
      <Regler titel="Wie selbstständig arbeitet die Klasse?" links="Braucht viel Anleitung" rechts="Sehr selbstständig" wert={gruppe.stark} setWert={setz('stark')} />
      <Regler titel="Wie ist das Leistungsvermögen der Klasse?" links="Eher leistungsschwach" rechts="Eher leistungsstark" wert={gruppe.leistung ?? 3} setWert={setz('leistung')} />
      <button className="text-xs text-primary underline" onClick={() => setGruppe({ fit: 3, stark: 3, leistung: 3 })}>Auf normale Lerngruppe zurücksetzen</button>
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Lernausgangslage <span className="font-normal text-muted-foreground">(optional)</span></p>
        <p className="text-xs text-muted-foreground">Was haben die Schüler schon gemacht, was ist im Vorfeld passiert? Worauf können wir aufbauen?</p>
        <FreitextMitSprache value={vorwissen} onChange={setVorwissen} rows={3} placeholder="Tippen oder einsprechen, z. B. Letzte Stunde: Aufbau eines Arguments kennengelernt" />
      </div>
    </div>
  );
}