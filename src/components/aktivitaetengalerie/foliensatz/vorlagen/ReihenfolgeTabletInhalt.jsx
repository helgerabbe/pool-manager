import React from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { SCHRITTE, GEMISCHT, tauschen } from '@/lib/reihenfolgeBeispiel';

/** Reihenfolge sortieren im Tablet-Rahmen: Karten mit Pfeilen nach oben/unten schieben. */
export default function ReihenfolgeTabletInhalt() {
  const [ordnung, setOrdnung] = React.useState(GEMISCHT);
  return (
    <div className="m-auto flex w-full max-w-3xl flex-col gap-2 rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      {ordnung.map((s, i) => (
        <div key={s} className="flex items-center gap-3 rounded-lg border-2 border-[#E4E1DA] px-3 py-1.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2A4074] text-sm font-bold text-white">{i + 1}</span>
          <span className="flex-1 text-base">{SCHRITTE[s]}</span>
          <button type="button" disabled={i === 0} onClick={() => setOrdnung(tauschen(ordnung, i, i - 1))} className="rounded-md bg-[#F6F7F9] p-1 disabled:opacity-30"><ChevronUp className="h-5 w-5" /></button>
          <button type="button" disabled={i === ordnung.length - 1} onClick={() => setOrdnung(tauschen(ordnung, i, i + 1))} className="rounded-md bg-[#F6F7F9] p-1 disabled:opacity-30"><ChevronDown className="h-5 w-5" /></button>
        </div>
      ))}
      <button type="button" onClick={() => setOrdnung(GEMISCHT)} className="ml-auto flex items-center gap-1 pt-1 text-base text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
    </div>
  );
}