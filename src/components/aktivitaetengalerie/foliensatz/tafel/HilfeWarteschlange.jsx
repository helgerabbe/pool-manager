import React from 'react';
import { Hand, Check } from 'lucide-react';

/** Wer sich meldet, steht in Reihenfolge; die Lehrkraft hakt ab, wen sie besucht hat. */
export default function HilfeWarteschlange({ team }) {
  const [liste, setListe] = React.useState(team ? ['Paar 2', 'Paar 5', 'Paar 1'] : ['Mia', 'Tom', 'Ali']);
  return (
    <div className="flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[10px]">
      <Hand className="h-3 w-3 shrink-0 text-[#8A4B3C]" /><b className="shrink-0">Hilfe:</b>
      {liste.length ? liste.map((n, i) => (
        <button key={n} type="button" onClick={() => setListe(liste.filter((x) => x !== n))} title="Besucht – abhaken"
          className="flex items-center gap-0.5 rounded-full bg-[#F5E1DC] px-1.5 text-[#8A4B3C]">{i + 1}. {n}<Check className="h-2.5 w-2.5" /></button>
      )) : <span className="text-[#6A7181]">niemand wartet</span>}
    </div>
  );
}