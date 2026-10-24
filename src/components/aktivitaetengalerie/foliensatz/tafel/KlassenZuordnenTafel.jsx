import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw } from 'lucide-react';
import SozialSymbol from '../vorlagen/SozialSymbol';

const PAARE = [
  ['Wurzel', 'nimmt Wasser und Nährstoffe aus dem Boden auf'],
  ['Stängel', 'leitet das Wasser nach oben'],
  ['Blatt', 'bildet mit Licht Zucker'],
  ['Blüte', 'dient der Fortpflanzung'],
];
const BEGRIFFE = ['Blatt', 'Wurzel', 'Blüte', 'Stängel'];
const knopf = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';

/** Begriffe zuordnen gemeinsam an der Tafel: Begriff antippen, dann Erklärung antippen. */
export default function KlassenZuordnenTafel() {
  const [wahl, setWahl] = React.useState(null);
  const [zu, setZu] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const vergeben = Object.values(zu);
  const setzen = (i) => {
    if (wahl) setZu({ ...Object.fromEntries(Object.entries(zu).filter(([, b]) => b !== wahl)), [i]: wahl });
    else if (zu[i]) { const { [i]: _, ...rest } = zu; setZu(rest); }
    setWahl(null); setGeprueft(false);
  };
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pb-4 pt-3 font-folie text-[#121721]">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-base font-bold text-[#2A4074]">Begriffe zuordnen</span>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-3 py-0.5 text-sm font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
        <span className="ml-auto origin-right scale-75"><SozialSymbol form="PL" /></span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {PAARE.map(([loesung, erkl], i) => {
          const farbe = !geprueft || !zu[i] ? 'border-[#2A4074] bg-[#E8EEF8]' : zu[i] === loesung ? 'border-emerald-600 bg-emerald-50' : 'border-red-500 bg-red-50';
          return (
            <button key={i} onClick={() => setzen(i)} className={`flex items-center gap-4 rounded-lg border-2 bg-white px-3 py-2 text-left text-xl ${wahl ? 'border-[#F59E2B]' : 'border-[#E4E1DA]'}`}>
              <span className={`min-w-[150px] rounded-md border-2 px-2 py-0.5 text-center font-semibold ${zu[i] ? farbe : 'border-dashed border-[#C9CED8] text-[#9AA1AE]'}`}>{zu[i] || '?'}</span>
              {erkl}
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 rounded-lg border-2 border-dashed border-[#C9CED8] p-2">
        {BEGRIFFE.filter((b) => !vergeben.includes(b)).map((b) => (
          <button key={b} onClick={() => setWahl(wahl === b ? null : b)} className={`rounded-lg border-2 px-3 py-1 text-lg font-semibold ${wahl === b ? 'border-[#F59E2B] bg-[#FDEBD3]' : 'border-[#C9CED8] bg-white'}`}>{b}</button>
        ))}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-4 w-4" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-4 w-4" />Zufallsschüler</button>
        <button onClick={() => { setZu({}); setGeprueft(false); setWahl(null); }} className={`${knopf} border-2 bg-white text-[#6A7181]`}><RotateCcw className="h-4 w-4" />Neu beginnen</button>
      </div>
    </div>
  );
}