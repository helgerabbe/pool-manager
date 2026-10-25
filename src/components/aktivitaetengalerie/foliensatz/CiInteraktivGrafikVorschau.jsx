import React from 'react';
import { CI_GRUND } from '@/lib/folienCI';
import KarteVorlage, { KARTEN_FARBEN } from './standard/kartenabfrage/KarteVorlage';
import KartenStapel from './standard/kartenabfrage/KartenStapel';

const ELEMENTE = [
  { name: 'Moderationskarte', regel: 'Hochformatiges, liniertes Kärtchen in Pastellfarbe mit oranger Kopflinie, leicht schräg, Text in Handschrift. Ein Gedanke pro Karte.' },
  { name: 'Kartenstapel', regel: 'Mehrere versetzte, helle Kartenrückseiten (Creme #F7F1E1, Rand #C9BFA6) mit zartem Muster, darunter der Zähler. Als Gruppe mit Oberbegriff darüber; Antippen zeigt die Karten darin.' },
];

/** Vorschau Teil 18: Grafische Elemente interaktiver Aufgabenfolien. */
export default function CiInteraktivGrafikVorschau() {
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
      <div className="flex items-end gap-6 text-[10px]">
        {KARTEN_FARBEN.slice(0, 2).map((f, i) => <KarteVorlage key={f} farbe={f} className={`w-28 ${i ? 'rotate-1' : '-rotate-1'}`}><span className="font-hand text-sm">{i ? 'Spielt am Meer' : 'Es geht um Freundschaft'}</span><br /><br /></KarteVorlage>)}
        <KartenStapel anzahl={4} />
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs">{ELEMENTE.map((e) => <li key={e.name}><b>{e.name}:</b> {e.regel}</li>)}</ul>
    </div>
  );
}