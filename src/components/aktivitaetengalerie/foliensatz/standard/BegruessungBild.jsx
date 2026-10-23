import React, { useState } from 'react';
import { UserX } from 'lucide-react';
import StoppHinweis from './StoppHinweis';

const FEHLEN = ['Jonas K.', 'Ella M.', 'Noah S.', 'Ben T.', 'Lina W.', 'Can Y.'];

/** Begrüßungsfolie; Lehreransicht mit Anmeldezähler und optionaler Liste „Wer fehlt noch?“. */
export default function BegruessungBild({ ansicht }) {
  const [offen, setOffen] = useState(false);
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">Guten Morgen!</p>
      <p className="text-xs text-[#6A7181]">Heute: Warum ziehen Menschen in die Städte?</p>
      {ansicht !== 'lehrer' && <StoppHinweis />}
      {ansicht === 'lehrer' && (
        <div className="mt-2 space-y-1 text-[10px]">
          <span>18 von 24 angemeldet · </span>
          <button onClick={() => setOffen(!offen)} className="inline-flex items-center gap-1 rounded-full border border-[#D6DCE5] bg-white px-2 py-0.5"><UserX className="h-3 w-3" />{offen ? 'Ausblenden' : 'Wer fehlt noch?'}</button>
          {offen && <div className="flex flex-wrap justify-center gap-1">{FEHLEN.map((n) => <span key={n} className="rounded-full bg-[#EEF0F3] px-2 py-0.5 text-[#6A7181]">{n}</span>)}</div>}
        </div>
      )}
    </div>
  );
}