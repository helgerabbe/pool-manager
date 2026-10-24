import React from 'react';
import { Hand, Check } from 'lucide-react';

/** Wer sich meldet, steht in Reihenfolge; die Lehrkraft hakt ab, wen sie besucht hat. */
export default function HilfeWarteschlange({ team }) {
  const [liste, setListe] = React.useState(team ? ['Paar 2', 'Paar 5', 'Paar 1'] : ['Mia', 'Tom', 'Ali']);
  return (
    <div className="rounded-lg border bg-white p-1.5 text-[10px]">
      <p className="mb-1 flex items-center gap-1 font-bold"><Hand className="h-3 w-3 text-[#8A4B3C]" />Hilfe</p>
      <div className="flex flex-col gap-0.5">
        {liste.length ? liste.map((n, i) => (
          <button key={n} type="button" onClick={() => setListe(liste.filter((x) => x !== n))} title="Besucht – abhaken"
            className="flex items-center justify-between rounded bg-[#F5E1DC] px-1.5 py-0.5 text-[#8A4B3C]">{i + 1}. {n}<Check className="h-2.5 w-2.5" /></button>
        )) : <span className="text-[#6A7181]">niemand wartet</span>}
      </div>
    </div>
  );
}