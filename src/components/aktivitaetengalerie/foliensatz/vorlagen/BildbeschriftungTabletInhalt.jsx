import React from 'react';
import { RotateCcw } from 'lucide-react';
import { WORTE, setzeWort } from '@/lib/bildbeschriftungBeispiel';
import PflanzenBild from './PflanzenBild';

/** Bildbeschriftung im Tablet-Rahmen: Wort antippen, dann die Markierung im Bild antippen. */
export default function BildbeschriftungTabletInhalt() {
  const [wahl, setWahl] = React.useState(null);
  const [zu, setZu] = React.useState({});
  const marke = (i) => { if (!wahl) return; setZu(setzeWort(zu, i, wahl)); setWahl(null); };
  const vergeben = Object.values(zu);
  return (
    <div className="m-auto flex h-full max-h-[460px] w-full max-w-3xl gap-4 rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      <div className="min-h-0 flex-1"><PflanzenBild zu={zu} aktiv={!!wahl} onMarke={marke} /></div>
      <div className="flex w-40 flex-col gap-2">
        {WORTE.map((w) => (
          <button key={w} type="button" onClick={() => setWahl(wahl === w ? null : w)}
            className={`rounded-lg border-2 px-3 py-1 text-base font-semibold ${wahl === w ? 'border-[#F08A24] bg-[#FBE3CF]' : vergeben.includes(w) ? 'bg-[#F6F7F9] text-[#9AA1AE]' : 'bg-[#F6F7F9]'}`}>{w}</button>
        ))}
        <button type="button" onClick={() => { setZu({}); setWahl(null); }} className="mt-auto flex items-center gap-1 text-base text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
      </div>
    </div>
  );
}