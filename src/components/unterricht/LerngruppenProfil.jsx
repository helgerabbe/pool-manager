import React from 'react';
import { Slider } from '@/components/ui/slider';

const REGLER = [
  { key: 'fit', titel: 'Arbeitstempo', links: 'Eher langsam', rechts: 'Eher schnell' },
  { key: 'stark', titel: 'Selbstständigkeit', links: 'Viel Anleitung', rechts: 'Sehr selbstständig' },
  { key: 'leistung', titel: 'Leistungsvermögen', links: 'Eher schwach', rechts: 'Eher stark' },
];

/** Globale Einschätzung der Lerngruppe; wird im Stundenplaner voreingestellt. */
export default function LerngruppenProfil({ profil, setProfil }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
      <p className="text-sm font-semibold">Einschätzung der Lerngruppe <span className="font-normal text-muted-foreground">(gilt als Voreinstellung für alle Stunden)</span></p>
      {REGLER.map((r) => (
        <div key={r.key} className="space-y-1.5">
          <p className="text-xs font-medium">{r.titel}</p>
          <Slider min={1} max={5} step={1} value={[profil[r.key] ?? 3]} onValueChange={([w]) => setProfil({ ...profil, [r.key]: w })} />
          <div className="flex justify-between text-[11px] text-muted-foreground"><span>{r.links}</span><span>{r.rechts}</span></div>
        </div>
      ))}
    </div>
  );
}