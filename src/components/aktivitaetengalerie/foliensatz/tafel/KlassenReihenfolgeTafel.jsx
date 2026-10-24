import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import SozialSymbol from '../vorlagen/SozialSymbol';
import { SCHRITTE, GEMISCHT, tauschen } from '@/lib/reihenfolgeBeispiel';

const knopf = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';

/** Reihenfolge sortieren gemeinsam an der Tafel. */
export default function KlassenReihenfolgeTafel() {
  const [ordnung, setOrdnung] = React.useState(GEMISCHT);
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const schieben = (i, j) => { setOrdnung(tauschen(ordnung, i, j)); setGeprueft(false); };
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pb-4 pt-3 font-folie text-[#121721]">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-base font-bold text-[#2A4074]">Reihenfolge sortieren</span>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-3 py-0.5 text-sm font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
        <span className="ml-auto origin-right scale-75"><SozialSymbol form="PL" /></span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {ordnung.map((s, i) => {
          const rahmen = !geprueft ? 'border-[#E4E1DA]' : s === i ? 'border-emerald-600 bg-emerald-50' : 'border-red-500 bg-red-50';
          return (
            <div key={s} className={`flex items-center gap-4 rounded-lg border-2 bg-white px-3 py-2 text-xl ${rahmen}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2A4074] font-bold text-white">{i + 1}</span>
              <span className="flex-1">{SCHRITTE[s]}</span>
              <button disabled={i === 0} onClick={() => schieben(i, i - 1)} className="rounded-md bg-[#F6F7F9] p-1 disabled:opacity-30"><ChevronUp className="h-6 w-6" /></button>
              <button disabled={i === ordnung.length - 1} onClick={() => schieben(i, i + 1)} className="rounded-md bg-[#F6F7F9] p-1 disabled:opacity-30"><ChevronDown className="h-6 w-6" /></button>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-4 w-4" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-4 w-4" />Zufallsschüler</button>
        <button onClick={() => { setOrdnung(GEMISCHT); setGeprueft(false); }} className={`${knopf} border-2 bg-white text-[#6A7181]`}><RotateCcw className="h-4 w-4" />Neu beginnen</button>
      </div>
    </div>
  );
}