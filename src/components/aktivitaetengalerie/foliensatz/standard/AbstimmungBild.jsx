import React, { useState } from 'react';

const PUNKTE = [['Hochdeutsch hilft bei Bewerbungen', 9], ['Dialekt gehört zur Herkunft', 5], ['Können zählt mehr als Sprache', 12]];

/** Standardfolie Abstimmung nach der Sammlung: Punkte als Karten, Tafel mit anonymen Balken. */
export default function AbstimmungBild({ ansicht }) {
  const [stimmen, setStimmen] = useState({});
  const rest = 3 - Object.values(stimmen).reduce((a, b) => a + b, 0);
  if (ansicht === 'schueler') return (
    <div className="w-full space-y-1 text-[9px]">
      <p className="text-[#6A7181]">Verteile deine Stimmen · noch {rest} von 3</p>
      {PUNKTE.map(([p]) => (
        <button key={p} onClick={() => rest > 0 && setStimmen({ ...stimmen, [p]: (stimmen[p] || 0) + 1 })} className="flex w-full items-center justify-between rounded-lg border bg-white px-2 py-1 text-left">
          {p}<span className="font-bold text-[#3E5C8A]">{'●'.repeat(stimmen[p] || 0)}</span>
        </button>
      ))}
    </div>
  );
  const sortiert = [...PUNKTE].sort((a, b) => b[1] - a[1]);
  return (
    <div className="w-full space-y-1 text-[9px]">
      <p className="font-bold">Was ist euch am wichtigsten?</p>
      {sortiert.map(([p, n], i) => (
        <div key={p}>
          <p>{p}</p>
          <div className="h-2 rounded bg-[#E4E1DA]"><div className="h-2 rounded" style={{ width: `${n * 7}%`, background: i === 0 ? '#3E5C8A' : '#B9D2EE' }} /></div>
        </div>
      ))}
      <p className="text-right text-[#6A7181]">anonym · aufgedeckt durch die Lehrkraft</p>
    </div>
  );
}