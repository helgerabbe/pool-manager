import React from 'react';
import { RotateCcw } from 'lucide-react';

const PAARE = [
  ['Wurzel', 'nimmt Wasser und Nährstoffe aus dem Boden auf'],
  ['Stängel', 'leitet das Wasser nach oben'],
  ['Blatt', 'bildet mit Licht Zucker'],
  ['Blüte', 'dient der Fortpflanzung'],
];
const BEGRIFFE = ['Blatt', 'Samen', 'Wurzel', 'Blüte', 'Knospe', 'Stängel'];

/** Begriffe zuordnen im Tablet-Rahmen: Begriff antippen, dann die passende Erklärung antippen. */
export default function ZuordnenTabletInhalt() {
  const [wahl, setWahl] = React.useState(null);
  const [zu, setZu] = React.useState({});
  const vergeben = Object.values(zu);
  const setzen = (i) => { if (!wahl) return; setZu({ ...Object.fromEntries(Object.entries(zu).filter(([, b]) => b !== wahl)), [i]: wahl }); setWahl(null); };
  return (
    <div className="m-auto flex flex-col gap-3 w-full max-w-3xl rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      <div className="flex flex-col gap-2">
        {PAARE.map(([, erkl], i) => (
          <button key={i} type="button" onClick={() => setzen(i)} className={`flex items-center gap-3 rounded-lg border-2 px-3 py-1.5 text-left ${wahl ? 'border-[#F08A24] bg-[#FFF7EE]' : 'border-[#E4E1DA]'}`}>
            <span className={`min-w-[100px] rounded-md border-2 border-dashed px-2 py-0.5 text-center text-base font-semibold ${zu[i] ? 'border-solid border-[#2A4074] bg-[#E8EEF8] text-[#2A4074]' : 'border-[#C9CED8] text-[#9AA1AE]'}`}>{zu[i] || '?'}</span>
            <span className="text-base">{erkl}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {BEGRIFFE.map((b) => (
          <button key={b} type="button" onClick={() => setWahl(wahl === b ? null : b)}
            className={`rounded-lg border-2 px-3 py-1 text-base font-semibold ${wahl === b ? 'border-[#F08A24] bg-[#FBE3CF]' : vergeben.includes(b) ? 'bg-[#F6F7F9] text-[#9AA1AE]' : 'bg-[#F6F7F9]'}`}>{b}</button>
        ))}
        <button type="button" onClick={() => { setZu({}); setWahl(null); }} className="ml-auto flex items-center gap-1 text-base text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
      </div>
    </div>
  );
}