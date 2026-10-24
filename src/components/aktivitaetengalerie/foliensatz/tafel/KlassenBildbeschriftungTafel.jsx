import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw } from 'lucide-react';
import SozialSymbol from '../vorlagen/SozialSymbol';
import PflanzenBild from '../vorlagen/PflanzenBild';
import { MARKEN, WORTE, setzeWort } from '@/lib/bildbeschriftungBeispiel';

const knopf = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';

/** Bildbeschriftung gemeinsam an der Tafel. */
export default function KlassenBildbeschriftungTafel() {
  const [wahl, setWahl] = React.useState(null);
  const [zu, setZu] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const marke = (i) => { if (!wahl) return; setZu(setzeWort(zu, i, wahl)); setWahl(null); setGeprueft(false); };
  const farbe = (i) => !geprueft || !zu[i] ? '' : zu[i] === MARKEN[i].loesung ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-red-500 bg-red-50 text-red-700';
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pb-4 pt-3 font-folie text-[#121721]">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-base font-bold text-[#2A4074]">Bildbeschriftung</span>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-3 py-0.5 text-sm font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
        <span className="ml-auto origin-right scale-75"><SozialSymbol form="PL" /></span>
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-h-0 flex-1"><PflanzenBild zu={zu} aktiv={!!wahl} onMarke={marke} farbe={farbe} gross /></div>
        <div className="flex w-44 flex-col gap-2 overflow-y-auto">
          {WORTE.map((w) => (
            <button key={w} onClick={() => setWahl(wahl === w ? null : w)} className={`rounded-lg border-2 px-3 py-1.5 text-lg font-semibold ${wahl === w ? 'border-[#F08A24] bg-[#FBE3CF]' : Object.values(zu).includes(w) ? 'bg-[#F6F7F9] text-[#9AA1AE]' : 'bg-[#F6F7F9]'}`}>{w}</button>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-4 w-4" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-4 w-4" />Zufallsschüler</button>
        <button onClick={() => { setZu({}); setWahl(null); setGeprueft(false); }} className={`${knopf} border-2 bg-white text-[#6A7181]`}><RotateCcw className="h-4 w-4" />Neu beginnen</button>
      </div>
    </div>
  );
}