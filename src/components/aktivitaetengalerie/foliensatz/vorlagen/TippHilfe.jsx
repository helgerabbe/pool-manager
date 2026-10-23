import React, { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { CI_HILFEN } from '@/lib/folienCI';

/** Tipp-Hilfe auf dem Tablet (CI Teil 8b): runder Knopf öffnet ein Blatt mit gestuften Tipps. */
export default function TippHilfe({ tipps, titel = 'Worauf kannst du achten?' }) {
  const [offen, setOffen] = useState(false);
  const [stufe, setStufe] = useState(1);
  const h = CI_HILFEN.tipp;
  return (
    <div className="absolute right-4 top-3 z-10 flex flex-col items-end gap-2">
      <button onClick={() => setOffen(!offen)} title={h.titel} className="flex h-12 w-12 items-center justify-center rounded-full border-2" style={{ background: h.hg, color: h.text, borderColor: h.rand }}><Lightbulb className="h-6 w-6" /></button>
      {offen && (
        <div className="w-[420px] rounded-xl border-2 p-4 text-lg shadow-lg" style={{ background: h.hg, borderColor: h.rand, color: h.text }}>
          <div className="mb-2 flex items-center justify-between font-semibold">{titel}<button onClick={() => setOffen(false)}><X className="h-5 w-5" /></button></div>
          {tipps.slice(0, stufe).map((t, i) => <p key={i} className="mb-1">{i + 1}. {t}</p>)}
          {stufe < tipps.length && <button onClick={() => setStufe(stufe + 1)} className="mt-1 rounded-full border bg-white px-3 py-1 text-base" style={{ borderColor: h.rand }}>Nächster Tipp</button>}
        </div>
      )}
    </div>
  );
}