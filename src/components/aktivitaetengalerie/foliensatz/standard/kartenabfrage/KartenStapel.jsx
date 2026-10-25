import React from 'react';

/** Verdeckter Kartenstapel mit Zähler; ein Klick deckt die oberste Karte auf (nur wenn aktiv). */
export default function KartenStapel({ anzahl, aktiv, onAufdecken }) {
  const lagen = Math.min(anzahl, 5);
  return (
    <button disabled={!aktiv || !anzahl} onClick={onAufdecken} className="group flex flex-col items-center gap-1 disabled:cursor-default">
      <div className="relative h-[3.6em] w-[5.6em]">
        {Array.from({ length: lagen }).map((_, i) => (
          <div key={i} className="absolute inset-0 rounded-[4px] border border-[#2A4074]/30 bg-[#3E5C8A] shadow" style={{ transform: `translate(${i * 2}px, ${-i * 2}px) rotate(${(i % 2 ? 1 : -1) * i}deg)` }} />
        ))}
        {!anzahl && <div className="absolute inset-0 rounded-[4px] border-2 border-dashed border-[#3E5C8A]/40" />}
        {aktiv && anzahl > 0 && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-white opacity-0 group-hover:opacity-100" style={{ transform: `translate(${(lagen - 1) * 2}px, ${-(lagen - 1) * 2}px)` }}>Aufdecken</span>}
      </div>
      <b className="text-[#2A4074]">{anzahl} {anzahl === 1 ? 'Karte' : 'Karten'} im Stapel</b>
    </button>
  );
}