import React from 'react';
import { MARKEN } from '@/lib/bildbeschriftungBeispiel';

/** Einfache Pflanzenzeichnung mit antippbaren Markierungen. */
export default function PflanzenBild({ zu, aktiv, onMarke, farbe = () => '', gross = false }) {
  return (
    <div className="relative mx-auto aspect-[4/5] h-full max-h-full rounded-lg bg-[#F6F7F9]">
      <svg viewBox="0 0 100 125" className="absolute inset-0 h-full w-full">
        <path d="M50 100 L50 30" stroke="#5B8C3A" strokeWidth="3" />
        <ellipse cx="66" cy="56" rx="14" ry="6" fill="#7DB356" transform="rotate(-25 66 56)" />
        <ellipse cx="36" cy="70" rx="12" ry="5" fill="#7DB356" transform="rotate(25 36 70)" />
        <circle cx="50" cy="24" r="9" fill="#F08A24" /><circle cx="50" cy="24" r="4" fill="#FFD25A" />
        <rect x="0" y="100" width="100" height="25" fill="#C8A57A" />
        <path d="M50 100 L42 118 M50 100 L58 116 M50 104 L50 121" stroke="#8A6A43" strokeWidth="1.5" />
      </svg>
      {MARKEN.map((m, i) => (
        <button key={i} type="button" onClick={() => onMarke(i)} style={{ left: `${m.x}%`, top: `${m.y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border-2 px-2 font-semibold ${gross ? 'text-lg' : 'text-sm'} ${farbe(i) || (zu[i] ? 'border-[#2A4074] bg-[#E8EEF8] text-[#2A4074]' : aktiv ? 'border-[#F08A24] bg-[#FFF7EE] text-[#9AA1AE]' : 'border-dashed border-[#9AA1AE] bg-white text-[#9AA1AE]')}`}>
          {zu[i] || i + 1}
        </button>
      ))}
    </div>
  );
}