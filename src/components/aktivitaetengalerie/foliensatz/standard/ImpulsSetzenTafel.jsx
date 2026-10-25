import React from 'react';
import { Search } from 'lucide-react';

/** Standardfolie „Impuls setzen (Material/Quelle)“ an der Tafel: Gegenstand + Untersuchungsimpuls. */
export default function ImpulsSetzenTafel() {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-[4%] px-[8%] pr-[28%]">
      <p className="text-[clamp(10px,1.4vw,16px)] text-[#6A7181]">Wir schauen uns jetzt etwas genauer an:</p>
      <p className="font-display text-[clamp(14px,2.4vw,28px)] font-bold leading-tight">„Hard Land“ von Benedict Wells</p>
      <div className="flex gap-2 rounded-xl bg-[#E3F1EF] p-[3%] text-[clamp(9px,1.2vw,14px)] leading-snug text-[#24504A]">
        <Search className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Nimm das Buch in die Hand. Schau dir Vorder- und Rückseite an, blättere es durch und lies die ersten Seiten. Lass es auf dich wirken.</p>
      </div>
    </div>
  );
}