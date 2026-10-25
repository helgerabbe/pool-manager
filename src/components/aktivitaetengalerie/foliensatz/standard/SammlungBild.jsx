import React, { useState } from 'react';
import { Hand } from 'lucide-react';

/** Standardfolie Sammlung: die Lehrkraft schreibt live in eine offene Liste mit. */
export default function SammlungBild({ ansicht }) {
  const [punkte, setPunkte] = useState(['Hochdeutsch hilft bei Bewerbungen', 'Dialekt gehört zur Herkunft']);
  const [text, setText] = useState('');
  if (ansicht === 'schueler') return (
    <div className="w-full space-y-1 text-[9px]">
      <div className="h-14 rounded-lg border bg-white p-1 text-[#9AA1AE]">Deine Notizen aus der Arbeitsphase …</div>
      <span className="inline-flex items-center gap-1 rounded-lg bg-[#FBE3CF] px-2 py-1 font-semibold text-[#8A4B1E]"><Hand className="h-3 w-3" /> Ich möchte etwas sagen</span>
    </div>
  );
  const neu = () => { if (text.trim()) { setPunkte([...punkte, text.trim()]); setText(''); } };
  return (
    <div className="w-full text-[9px]">
      <p className="mb-1 font-bold">Was habt ihr herausgefunden?</p>
      <div className="min-h-[50px] rounded-lg bg-white p-1">{punkte.map((p) => <p key={p}>• {p}</p>)}</div>
      <div className="mt-1 flex gap-1">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && neu()} placeholder="Lehrkraft tippt mit …" className="flex-1 rounded border px-1 py-0.5" />
        <button onClick={neu} className="rounded bg-[#3E5C8A] px-2 text-white">+</button>
      </div>
    </div>
  );
}