import React from 'react';
import { RotateCcw } from 'lucide-react';

const PAARE = [
  ['Wurzel', 'nimmt Wasser und Nährstoffe aus dem Boden auf'],
  ['Stängel', 'leitet das Wasser nach oben'],
  ['Blatt', 'bildet mit Licht Zucker'],
  ['Blüte', 'dient der Fortpflanzung'],
];
const BEGRIFFE = ['Blatt', 'Wurzel', 'Blüte', 'Stängel'];

/** Begriffe zuordnen im Tablet-Rahmen: Begriff antippen, dann die passende Erklärung antippen. */
export default function ZuordnenTabletInhalt() {
  const [wahl, setWahl] = React.useState(null);
  const [zu, setZu] = React.useState({});
  const vergeben = Object.values(zu);
  const setzen = (i) => { if (!wahl) return; setZu({ ...Object.fromEntries(Object.entries(zu).filter(([, b]) => b !== wahl)), [i]: wahl }); setWahl(null); };
  return (
    <div className="flex min-h-[420px] flex-1 flex-col gap-4 rounded-xl border-2 border-[#C9CED8] bg-white p-5">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {PAARE.map(([, erkl], i) => (
          <button key={i} type="button" onClick={() => setzen(i)} className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3 text-left ${wahl ? 'border-[#F08A24] bg-[#FFF7EE]' : 'border-[#E4E1DA]'}`}>
            <span className={`min-w-[140px] rounded-lg border-2 border-dashed px-3 py-1.5 text-center text-xl font-semibold ${zu[i] ? 'border-solid border-[#2A4074] bg-[#E8EEF8] text-[#2A4074]' : 'border-[#C9CED8] text-[#9AA1AE]'}`}>{zu[i] || '?'}</span>
            <span className="text-xl">{erkl}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        {BEGRIFFE.map((b) => (
          <button key={b} type="button" onClick={() => setWahl(wahl === b ? null : b)}
            className={`rounded-xl border-2 px-5 py-2 text-xl font-semibold ${wahl === b ? 'border-[#F08A24] bg-[#FBE3CF]' : vergeben.includes(b) ? 'bg-[#F6F7F9] text-[#9AA1AE]' : 'bg-[#F6F7F9]'}`}>{b}</button>
        ))}
        <button type="button" onClick={() => { setZu({}); setWahl(null); }} className="ml-auto flex items-center gap-1 text-base text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
      </div>
    </div>
  );
}