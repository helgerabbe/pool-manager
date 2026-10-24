import React from 'react';

const WERTE = [['Läuft', 14, '#7FB894'], ['Geht so', 7, '#EBD9A0'], ['Ich hänge fest', 3, '#E3A493']];
const summe = WERTE.reduce((s, [, n]) => s + n, 0);

/** Anonyme Balken: Wie kommen die Schüler gerade zurecht? */
export default function Stimmungsbarometer() {
  return (
    <div className="rounded-lg border bg-white px-2 py-1 text-[10px]">
      <b>Wie läuft es bei euch?</b>
      <div className="mt-1 flex h-2 overflow-hidden rounded">{WERTE.map(([n, z, f]) => <div key={n} style={{ width: `${(z / summe) * 100}%`, background: f }} />)}</div>
      <div className="mt-0.5 flex justify-between text-[#6A7181]">{WERTE.map(([n, z]) => <span key={n}>{n}: {z}</span>)}</div>
    </div>
  );
}