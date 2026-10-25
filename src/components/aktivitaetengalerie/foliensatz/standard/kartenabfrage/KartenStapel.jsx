import React from 'react';

/** Layout-Vorlage Kartenstapel: helle, versetzte Kartenrückseiten mit Zähler; Klick deckt auf (wenn aktiv). */
export default function KartenStapel({ anzahl, aktiv, onAufdecken, text }) {
  const lagen = Math.max(1, Math.min(anzahl, 5));
  return (
    <button disabled={!aktiv || !anzahl} onClick={onAufdecken} className="group flex flex-col items-start gap-1 disabled:cursor-default">
      <div className="relative h-[4.6em] w-[3.8em]">
        {Array.from({ length: lagen }).map((_, i) => (
          <div key={i} className={`absolute inset-0 rounded-[4px] border border-[#C9BFA6] bg-[#F7F1E1] shadow-[0_1px_3px_rgba(42,64,116,0.2)] ${!anzahl ? 'border-dashed opacity-50' : ''}`} style={{ transform: `translate(${i * 3}px, ${-i * 3}px) rotate(${(i % 2 ? 1.5 : -1.5)}deg)` }}>
            {i === lagen - 1 && anzahl > 0 && <div className="absolute inset-[18%] rounded-[3px] border border-[#E07A5F]/40 bg-[repeating-linear-gradient(45deg,transparent_0,transparent_3px,rgba(224,122,95,0.12)_3px,rgba(224,122,95,0.12)_5px)]" />}
          </div>
        ))}
      </div>
      <b className="whitespace-nowrap text-[#2A4074]">{text ?? `${anzahl} ${anzahl === 1 ? 'Karte' : 'Karten'}${aktiv ? '' : ' im Stapel'}`}</b>
    </button>
  );
}