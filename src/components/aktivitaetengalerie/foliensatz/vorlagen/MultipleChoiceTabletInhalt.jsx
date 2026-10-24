import React from 'react';
import { RotateCcw } from 'lucide-react';
import { FRAGEN } from '@/lib/multipleChoiceBeispiel';

const BUCHSTABEN = ['A', 'B', 'C', 'D'];

/** Multiple Choice im Tablet-Rahmen: je Frage eine Antwort antippen. */
export default function MultipleChoiceTabletInhalt() {
  const [wahl, setWahl] = React.useState({});
  return (
    <div className="m-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      {FRAGEN.map((f, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <p className="text-base font-semibold">{i + 1}. {f.frage}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {f.antworten.map((a, j) => (
              <button key={j} type="button" onClick={() => setWahl({ ...wahl, [i]: j })}
                className={`flex items-center gap-2 rounded-lg border-2 px-3 py-1 text-left text-base ${wahl[i] === j ? 'border-[#2A4074] bg-[#E8EEF8] font-semibold text-[#2A4074]' : 'border-[#E4E1DA] bg-[#F6F7F9]'}`}>
                <span className="font-bold text-[#6A7181]">{BUCHSTABEN[j]}</span>{a}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setWahl({})} className="ml-auto flex items-center gap-1 text-base text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
    </div>
  );
}