import React, { useState } from 'react';
import { Send } from 'lucide-react';
import KarteVorlage, { KARTEN_FARBEN } from './KarteVorlage';

/** Tablet: eine echte Karte beschreiben und in den Stapel an der Tafel schicken (max. 3). */
export default function KartenTablet({ onSenden }) {
  const [meine, setMeine] = useState([]);
  const [text, setText] = useState('');
  const senden = () => { setMeine([...meine, text.trim()]); onSenden?.(text.trim()); setText(''); };
  return (
    <div className="flex w-full items-center gap-[6%] px-[4%] text-[9px]">
      <div className="flex-1 space-y-1.5">
        <p className="font-display text-[11px] font-bold">Was fällt dir dazu ein?</p>
        {meine.length < 3 ? (
          <>
            <KarteVorlage farbe={KARTEN_FARBEN[meine.length]} className="-rotate-1">
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={60} rows={3} placeholder="Ein Gedanke pro Karte …" className="w-full resize-none bg-transparent font-hand text-[13px] leading-[1.45em] outline-none placeholder:text-[#6A7181]/60" />
            </KarteVorlage>
            <div className="flex items-center justify-between">
              <span className="text-[#6A7181]">Karte {meine.length + 1} von 3 · {60 - text.length} Zeichen</span>
              <button disabled={!text.trim()} onClick={senden} className="inline-flex items-center gap-1 rounded-full bg-[#2A4074] px-2.5 py-1 text-white disabled:opacity-40">An die Tafel <Send className="h-3 w-3" /></button>
            </div>
          </>
        ) : <p className="font-semibold text-[#2E7D4F]">Fertig! Deine Karten liegen im Stapel an der Tafel.</p>}
      </div>
      <div className="w-[28%] space-y-1">
        <p className="text-[8px] uppercase text-[#6A7181]">Deine Karten</p>
        {meine.map((m, i) => <KarteVorlage key={i} farbe={KARTEN_FARBEN[i]} className={i % 2 ? 'rotate-1' : '-rotate-1'}><span className="font-hand text-[11px]">{m}</span></KarteVorlage>)}
      </div>
    </div>
  );
}