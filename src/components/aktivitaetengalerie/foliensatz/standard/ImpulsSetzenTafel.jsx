import React from 'react';
import { Search } from 'lucide-react';

const BEISPIEL_BILD = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600';

/** Standardfolie „Impuls setzen (Material/Quelle)“ an der Tafel: Gegenstand, optionales Bild, Untersuchungsimpuls. */
export default function ImpulsSetzenTafel({ bild = BEISPIEL_BILD }) {
  return (
    <div className="absolute inset-0 flex items-start gap-[5%] px-[7%] pt-[11%]">
      <div className="flex min-w-0 flex-1 flex-col gap-[0.6em] text-[2.3cqw]">
        <p className="whitespace-nowrap text-[#6A7181]">Wir schauen uns jetzt genauer an:</p>
        <p className="font-display text-[2em] font-bold leading-tight">„Hard Land“<span className="block text-[0.6em] font-semibold text-[#6A7181]">von Benedict Wells</span></p>
        <div className="flex gap-2 rounded-xl bg-[#E3F1EF] p-[0.8em] leading-snug text-[#24504A]">
          <Search className="mt-0.5 h-[1.2em] w-[1.2em] shrink-0" />
          <p>Nimm das Buch in die Hand. Schau dir Vorder- und Rückseite an, blättere es durch und lies die ersten Seiten. Lass es auf dich wirken.</p>
        </div>
      </div>
      {bild && (
        <div className="w-[32%] shrink-0 rotate-2 bg-white p-[1.2%] shadow-md">
          <img src={bild} alt="" className="aspect-[4/5] w-full object-cover" />
        </div>
      )}
    </div>
  );
}