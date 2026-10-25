import React, { useState } from 'react';

const STUFEN = ['Zustimmung', 'Eher Zustimmung', 'Unentschieden', 'Eher Ablehnung', 'Ablehnung'];
const VORHER = [10, 25, 20, 30, 15];
const JETZT = [15, 35, 10, 25, 15];
const THESE = 'Wer nicht perfekt Hochdeutsch spricht, hat keine Chance auf Erfolg.';

/** Standardfolie Positionierung / Stimmungsbild, mit Variante Vorher-Nachher. */
export default function PositionierungBild({ ansicht }) {
  const [variante, setVariante] = useState('erst');
  const [wahl, setWahl] = useState(null);
  const vergleich = variante === 'vergleich';
  return (
    <div className="w-full text-[9px]">
      <div className="mb-1 flex gap-1">
        {[['erst', 'Positionierung'], ['vergleich', 'Vorher-Nachher']].map(([k, l]) => <button key={k} onClick={() => setVariante(k)} className={`rounded-full border px-2 py-0.5 ${variante === k ? 'bg-[#F5E1DC] font-semibold' : 'bg-white'}`}>{l}</button>)}
      </div>
      <p className="mb-1 text-center text-[#6A7181]">{THESE}</p>
      {ansicht === 'schueler' ? (
        <div className="flex gap-1">
          {STUFEN.map((s, i) => (
            <button key={s} onClick={() => setWahl(i)} className={`flex-1 rounded-lg border-2 px-1 py-2 font-semibold ${wahl === i ? 'border-[#3E5C8A] bg-[#E3EEF9]' : 'bg-white'} ${vergleich && i === 3 ? 'ring-2 ring-dashed ring-[#C9CED8]' : ''}`}>{s}</button>
          ))}
        </div>
      ) : (
        <div className="flex h-20 items-end gap-2">
          {STUFEN.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div className="flex h-14 w-full items-end justify-center gap-0.5">
                {vergleich && <div className="w-3 rounded-t bg-[#C9D6EA]" style={{ height: `${VORHER[i] * 1.6}%` }} />}
                <div className="w-3 rounded-t bg-[#3E5C8A]" style={{ height: `${JETZT[i] * 1.6}%` }} />
              </div>
              <span className="text-center leading-tight">{s}</span>
            </div>
          ))}
        </div>
      )}
      {vergleich && <p className="mt-1 text-right text-[#6A7181]">{ansicht === 'schueler' ? 'gestrichelt: deine erste Position' : 'blass: vorher · kräftig: jetzt'}</p>}
    </div>
  );
}