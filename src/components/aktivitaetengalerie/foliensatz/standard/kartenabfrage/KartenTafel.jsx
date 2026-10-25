import React, { useState } from 'react';
import { Eye, X, Plus } from 'lucide-react';
import KarteVorlage, { KARTEN_FARBEN } from './KarteVorlage';
import KartenStapel from './KartenStapel';

/** Tafel: Sammeln (nur Stapel + Zähler), dann Clustern (aufdecken, auswählen, unter Oberbegriff ablegen). */
export default function KartenTafel({ stapel, setStapel }) {
  const [modus, setModus] = useState('sammeln');
  const [offen, setOffen] = useState([]); // aufgedeckte Karten {t, n, g, f}
  const [gewaehlt, setGewaehlt] = useState(null);
  const [begriffe, setBegriffe] = useState([]);
  const [neu, setNeu] = useState('');
  const [namen, setNamen] = useState([]);

  const aufdecken = () => { const [oben, ...rest] = stapel; setStapel(rest); setOffen([...offen, { ...oben, g: '', f: KARTEN_FARBEN[offen.length % 4] }]); };
  const ablegen = (g) => { if (gewaehlt === null) return; setOffen(offen.map((k, i) => (i === gewaehlt ? { ...k, g } : k))); setGewaehlt(null); };
  const karte = (k, i) => (
    <KarteVorlage key={i} farbe={k.f} onClick={(e) => { e.stopPropagation(); setGewaehlt(gewaehlt === i ? null : i); }} className={`cursor-pointer pr-5 transition ${gewaehlt === i ? 'ring-2 ring-[#E07A5F] -translate-y-0.5' : ''}`}>
      <span className="font-hand text-[11px]">{k.t}</span>
      {namen.includes(i) && <span className="block text-[7px] text-[#6A7181]">{k.n}</span>}
      <span className="absolute right-0.5 top-1.5 flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Eye onClick={() => setNamen(namen.includes(i) ? namen.filter((x) => x !== i) : [...namen, i])} className="h-2.5 w-2.5 cursor-pointer text-[#6A7181]" />
        <X onClick={() => { setOffen(offen.filter((_, j) => j !== i)); setGewaehlt(null); }} className="h-2.5 w-2.5 cursor-pointer text-[#C0392B]" />
      </span>
    </KarteVorlage>
  );
  const spalte = (g, titel) => (
    <div key={g || 'ablage'} onClick={() => ablegen(g)} className={`min-h-[4em] space-y-1 rounded-lg p-1 ${g ? 'bg-white/80 ring-1 ring-[#2A4074]/15' : 'border border-dashed border-[#6A7181]/40'} ${gewaehlt !== null ? 'cursor-copy' : ''}`}>
      <p className={`font-bold ${g ? 'border-b-2 border-[#2A4074] text-[#2A4074]' : 'text-[#6A7181]'}`}>{titel}</p>
      {offen.map((k, i) => k.g === g && karte(k, i))}
    </div>
  );

  return (
    <div className="w-full text-[9px]">
      <div className="mb-1.5 flex items-center gap-1">
        <b className="mr-auto font-display text-[11px]">Was fällt euch dazu ein?</b>
        {['sammeln', 'clustern'].map((m) => <button key={m} onClick={() => setModus(m)} className={`rounded-full px-2 py-0.5 ${modus === m ? 'bg-[#2A4074] text-white' : 'border bg-white'}`}>{m === 'sammeln' ? 'Sammeln' : 'Clustern'}</button>)}
      </div>
      {modus === 'sammeln' ? (
        <div className="flex flex-col items-center gap-1 py-2 text-[11px]">
          <KartenStapel anzahl={stapel.length} />
          <p className="text-[8px] text-[#6A7181]">Die Karten bleiben verdeckt, bis ihr clustert.</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="w-[18%] shrink-0"><KartenStapel anzahl={stapel.length} aktiv onAufdecken={aufdecken} /></div>
          <div className="grid flex-1 grid-cols-4 gap-1">
            {spalte('', gewaehlt !== null ? 'Hier ablegen' : 'Aufgedeckt')}
            {begriffe.map((b) => spalte(b, b))}
            <form onSubmit={(e) => { e.preventDefault(); if (neu.trim()) { setBegriffe([...begriffe, neu.trim()]); setNeu(''); } }} className="flex h-fit items-center gap-0.5 rounded-lg border border-dashed p-1">
              <input value={neu} onChange={(e) => setNeu(e.target.value)} placeholder="Oberbegriff" className="w-full bg-transparent outline-none" />
              <button><Plus className="h-3 w-3" /></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}