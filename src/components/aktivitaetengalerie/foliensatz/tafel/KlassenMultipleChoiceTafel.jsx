import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import SozialSymbol from '../vorlagen/SozialSymbol';
import { FRAGEN } from '@/lib/multipleChoiceBeispiel';

const knopf = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';
const BUCHSTABEN = ['A', 'B', 'C', 'D'];

/** Multiple Choice gemeinsam an der Tafel: eine Frage groß, Antworten als Kacheln. */
export default function KlassenMultipleChoiceTafel() {
  const [nr, setNr] = React.useState(0);
  const [wahl, setWahl] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const f = FRAGEN[nr];
  const farbe = (j) => {
    if (geprueft && j === f.richtig) return 'border-emerald-600 bg-emerald-50 text-emerald-800';
    if (geprueft && wahl[nr] === j) return 'border-red-500 bg-red-50 text-red-700';
    return wahl[nr] === j ? 'border-[#2A4074] bg-[#E8EEF8] text-[#2A4074]' : 'border-[#E4E1DA] bg-white';
  };
  const wechseln = (n) => { setNr(n); setGeprueft(false); };
  return (
    <div className="flex flex-1 flex-col gap-3 px-6 pb-4 pt-3 font-folie text-[#121721]">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-base font-bold text-[#2A4074]">Multiple Choice · Frage {nr + 1} von {FRAGEN.length}</span>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-3 py-0.5 text-sm font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
        <span className="ml-auto origin-right scale-75"><SozialSymbol form="PL" /></span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <p className="text-2xl font-bold">{f.frage}</p>
        <div className="grid grid-cols-2 gap-3">
          {f.antworten.map((a, j) => (
            <button key={j} onClick={() => { setWahl({ ...wahl, [nr]: j }); setGeprueft(false); }} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-xl font-semibold ${farbe(j)}`}>
              <span className="text-[#6A7181]">{BUCHSTABEN[j]}</span>{a}
            </button>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-4 w-4" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-4 w-4" />Zufallsschüler</button>
        <button onClick={() => { setWahl({}); wechseln(0); }} className={`${knopf} border-2 bg-white text-[#6A7181]`}><RotateCcw className="h-4 w-4" />Neu beginnen</button>
        <button disabled={nr === 0} onClick={() => wechseln(nr - 1)} className={`${knopf} ml-auto border-2 bg-white disabled:opacity-40`}><ChevronLeft className="h-4 w-4" /></button>
        <button disabled={nr === FRAGEN.length - 1} onClick={() => wechseln(nr + 1)} className={`${knopf} border-2 bg-white disabled:opacity-40`}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}