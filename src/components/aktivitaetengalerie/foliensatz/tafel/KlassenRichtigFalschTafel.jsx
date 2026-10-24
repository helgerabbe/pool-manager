import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw, Check, X } from 'lucide-react';
import SozialSymbol from '../vorlagen/SozialSymbol';
import { AUSSAGEN } from '@/lib/richtigFalschBeispiel';

const knopf = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';
const wahl = (aktiv, farbe) => `flex items-center gap-1 rounded-lg border-2 px-3 py-1 font-semibold ${aktiv ? farbe : 'border-[#E4E1DA] bg-[#F6F7F9] text-[#6A7181]'}`;

/** Richtig oder falsch gemeinsam an der Tafel. */
export default function KlassenRichtigFalschTafel() {
  const [antwort, setAntwort] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const setzen = (i, w) => { setAntwort({ ...antwort, [i]: w }); setGeprueft(false); };
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pb-4 pt-3 font-folie text-[#121721]">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-base font-bold text-[#2A4074]">Richtig oder falsch</span>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-3 py-0.5 text-sm font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
        <span className="ml-auto origin-right scale-75"><SozialSymbol form="PL" /></span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {AUSSAGEN.map((a, i) => {
          const rahmen = !geprueft || antwort[i] === undefined ? 'border-[#E4E1DA]' : antwort[i] === a.richtig ? 'border-emerald-600 bg-emerald-50' : 'border-red-500 bg-red-50';
          return (
            <div key={i} className={`flex items-center gap-4 rounded-lg border-2 bg-white px-3 py-2 text-xl ${rahmen}`}>
              <span className="flex-1">{a.text}</span>
              <button onClick={() => setzen(i, true)} className={wahl(antwort[i] === true, 'border-emerald-600 bg-emerald-50 text-emerald-800')}><Check className="h-5 w-5" />Richtig</button>
              <button onClick={() => setzen(i, false)} className={wahl(antwort[i] === false, 'border-red-500 bg-red-50 text-red-700')}><X className="h-5 w-5" />Falsch</button>
            </div>
          );
        })}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-4 w-4" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-4 w-4" />Zufallsschüler</button>
        <button onClick={() => { setAntwort({}); setGeprueft(false); }} className={`${knopf} border-2 bg-white text-[#6A7181]`}><RotateCcw className="h-4 w-4" />Neu beginnen</button>
      </div>
    </div>
  );
}