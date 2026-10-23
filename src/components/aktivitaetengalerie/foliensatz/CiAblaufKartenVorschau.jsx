import React from 'react';
import AblaufKarten from './vorlagen/AblaufKarten';

const PHASEN = [
  { sozialform: 'EA', name: 'Think', satz: 'Du denkst allein nach.' },
  { sozialform: 'PA', name: 'Pair', satz: 'Ihr vergleicht zu zweit.' },
  { sozialform: 'PL', name: 'Share', satz: 'Ihr stellt der Klasse vor.' },
];
const SCHRITTE = [
  { name: 'Lesen', satz: 'Lies den Text genau.' },
  { name: 'Markieren', satz: 'Markiere wichtige Stellen.' },
  { name: 'Notieren', satz: 'Schreibe Stichpunkte.' },
  { name: 'Vergleichen', satz: 'Vergleiche mit deinem Partner.' },
];

const REGELN = [
  '2 bis 4 Karten nebeneinander, alle gleich groß, grauer Pfeil dazwischen',
  'Weiße Karte, 2px Rand, runde Ecken, kein Schatten',
  'Kopf: Sozialform-Symbol bei Phasen, sonst Nummer im Kreis',
  'Name: ein Wort oder kurzer Begriff in Blau · Satz: höchstens 3 Zeilen',
  'Einsatz: Phasen, Arbeitsschritte, Stationen, Abteilungen, Reihenfolgen',
];

/** Teil 16: Ablaufkarten – mehrere Abschnitte hintereinander zeigen. */
export default function CiAblaufKartenVorschau() {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-3">
        <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Mit Sozialform (Phasen)</p><div className="flex h-48 rounded-lg bg-[#F7F5EF] p-3"><AblaufKarten karten={PHASEN} klein /></div></div>
        <div><p className="mb-1 text-xs font-semibold text-muted-foreground">Mit Nummer (Schritte, Stationen)</p><div className="flex h-48 rounded-lg bg-[#F7F5EF] p-3"><AblaufKarten karten={SCHRITTE} klein /></div></div>
      </div>
      <ul className="list-disc pl-5 text-sm">{REGELN.map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  );
}