import React, { useState } from 'react';
import { PenLine } from 'lucide-react';
import SatzImpulse from './SatzImpulse';

/** Sammlungsfolie: Die Lehrkraft tippt live mit, was die Schüler im Plenum nennen. Kein Merksatz, nur eine offene Liste. */
export default function SammlungInhalt({ f }) {
  const [punkte, setPunkte] = useState(f.punkte || []);
  const [text, setText] = useState('');
  const hinzu = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPunkte([...punkte, text.trim()]);
    setText('');
  };
  return (
    <div className="flex flex-1 flex-col gap-5 pr-48">
      <div>
        <h2 className="text-[40px] font-bold leading-tight">{f.titel}</h2>
        {f.frage && <p className="mt-1 text-2xl text-[#3E5C8A]">{f.frage}</p>}
      </div>
      {f.satzimpulse?.length > 0 && <SatzImpulse impulse={f.satzimpulse} />}
      <div className="flex flex-1 flex-col rounded-xl border-2 border-dashed border-[#C9CED8] bg-white px-8 py-5">
        <ul className="flex-1 columns-2 gap-10 text-[26px] leading-snug">
          {punkte.map((p, i) => <li key={i} className="mb-2 break-inside-avoid">• {p}</li>)}
        </ul>
        <form onSubmit={hinzu} className="flex items-center gap-3 border-t border-[#E4E1DA] pt-3 text-xl text-[#6A7181]">
          <PenLine className="h-6 w-6" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mitschreiben … (Enter fügt hinzu)" className="flex-1 bg-transparent outline-none" />
        </form>
      </div>
    </div>
  );
}