import React from 'react';
import { Check, X, RotateCcw } from 'lucide-react';
import { AUSSAGEN } from '@/lib/richtigFalschBeispiel';

const wahlKnopf = (aktiv, farbe) => `flex items-center gap-1 rounded-lg border-2 px-3 py-1 text-base font-semibold ${aktiv ? farbe : 'border-[#E4E1DA] bg-[#F6F7F9] text-[#6A7181]'}`;

/** Richtig oder falsch im Tablet-Rahmen: je Aussage „Richtig“ oder „Falsch“ antippen. */
export default function RichtigFalschTabletInhalt() {
  const [antwort, setAntwort] = React.useState({});
  return (
    <div className="m-auto flex w-full max-w-3xl flex-col gap-2 rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      {AUSSAGEN.map((a, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border-2 border-[#E4E1DA] px-3 py-1.5">
          <span className="flex-1 text-base">{a.text}</span>
          <button type="button" onClick={() => setAntwort({ ...antwort, [i]: true })} className={wahlKnopf(antwort[i] === true, 'border-emerald-600 bg-emerald-50 text-emerald-800')}><Check className="h-4 w-4" /> Richtig</button>
          <button type="button" onClick={() => setAntwort({ ...antwort, [i]: false })} className={wahlKnopf(antwort[i] === false, 'border-red-500 bg-red-50 text-red-700')}><X className="h-4 w-4" /> Falsch</button>
        </div>
      ))}
      <button type="button" onClick={() => setAntwort({})} className="ml-auto flex items-center gap-1 pt-1 text-base text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
    </div>
  );
}