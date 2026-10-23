import React from 'react';
import { Users, User } from 'lucide-react';

// Beispieldaten: 15 Paare, 1 Dreier, 1 Allein-Wunsch, 2 ohne Partner (max. 18 Kacheln).
const NAMEN = ['Ali', 'Mia', 'Ben', 'Lea', 'Noah', 'Emma', 'Finn', 'Lina', 'Paul', 'Ida', 'Tom', 'Zoe', 'Jan', 'Ella', 'Max', 'Nele', 'Leo', 'Ronja', 'Elias', 'Mila', 'Luca', 'Frida', 'Emil', 'Hanna', 'Milan', 'Sophie', 'Anton', 'Clara', 'Jonas', 'Lotta', 'Karl', 'Maja', 'Theo', 'Greta'];
const BEISPIEL = [
  ...Array.from({ length: 15 }, (_, i) => ({ art: 'paar', namen: [NAMEN[i * 2], NAMEN[i * 2 + 1]] })),
  { art: 'paar', namen: ['Karl', 'Maja', 'Theo'] },
  { art: 'allein', namen: ['Jonas'] },
];

/** Tafelbild „Wer arbeitet mit wem?“: bis zu 18 Kacheln im Raster 6 × 3, gut lesbar von hinten. */
export default function PartnerTafel({ gruppen = BEISPIEL, ohne = ['Greta', 'Lotta'] }) {
  let nr = 0;
  return (
    <div className="flex flex-1 flex-col gap-3">
      <h2 className="text-[36px] font-bold leading-tight">Wer arbeitet mit wem?</h2>
      <div className="grid flex-1 grid-cols-6 grid-rows-3 gap-3">
        {gruppen.slice(0, 18).map((g, i) => {
          const allein = g.art === 'allein';
          if (!allein) nr += 1;
          return (
            <div key={i} className="flex flex-col justify-center rounded-xl border-2 px-3 py-2" style={{ background: allein ? '#FBF1D3' : '#FFFFFF', borderColor: allein ? '#E3C46A' : '#D8DEE9' }}>
              <p className="flex items-center gap-2 text-[26px] font-bold leading-none text-[#2A4074]">
                {allein ? <User className="h-6 w-6" /> : <Users className="h-6 w-6" />}{allein ? 'allein?' : nr}
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-tight text-[#1F2937]">{g.namen.join(' · ')}</p>
            </div>
          );
        })}
      </div>
      {ohne.length > 0 && <p className="rounded-lg bg-[#EEF1F6] px-4 py-2 text-[20px] text-[#6A7181]">Noch ohne Partner: {ohne.join(', ')}</p>}
    </div>
  );
}