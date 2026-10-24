import React from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { PAARE, ZIEL, naechstes, antworten } from '@/lib/zuordnungstrainingBeispiel';

/** Zuordnungstraining: ein Begriff, vier Antworten; jedes Paar muss ZIEL-mal richtig sein. */
export default function ZuordnungstrainingTabletInhalt() {
  const [stand, setStand] = React.useState({});
  const [akt, setAkt] = React.useState(() => naechstes({}, null));
  const [opts, setOpts] = React.useState(() => antworten(akt));
  const [wahl, setWahl] = React.useState(null);
  const sitzen = PAARE.filter((_, i) => (stand[i] || 0) >= ZIEL).length;
  const weiter = (s) => { const n = naechstes(s, akt); setAkt(n); setWahl(null); if (n !== null) setOpts(antworten(n)); };
  const tippe = (w) => {
    if (wahl) return;
    setWahl(w);
    const s = { ...stand, [akt]: w === PAARE[akt][1] ? (stand[akt] || 0) + 1 : 0 };
    setStand(s);
    setTimeout(() => weiter(s), 900);
  };
  const neu = () => { setStand({}); weiter({}); };
  return (
    <div className="m-auto flex w-full max-w-2xl flex-col gap-4 rounded-xl border-2 border-[#C9CED8] bg-white p-5">
      <div className="flex items-center gap-3 text-base text-[#6A7181]">
        <div className="h-2 flex-1 rounded-full bg-[#E4E1DA]"><div className="h-2 rounded-full bg-[#7DB356]" style={{ width: `${(sitzen / PAARE.length) * 100}%` }} /></div>
        <span>{sitzen} von {PAARE.length} sitzen</span>
        <button type="button" onClick={neu} className="flex items-center gap-1"><RotateCcw className="h-4 w-4" /> Neu</button>
      </div>
      {akt === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-2xl font-semibold text-[#2A4074]"><Trophy className="h-7 w-7 text-[#F08A24]" /> Alles sitzt!</p>
      ) : <>
        <p className="py-4 text-center text-[32px] font-bold text-[#121721]">{PAARE[akt][0]}</p>
        <div className="grid grid-cols-2 gap-3">
          {opts.map((w) => {
            const richtig = w === PAARE[akt][1];
            const farbe = !wahl ? 'bg-[#F6F7F9]' : richtig ? 'border-emerald-600 bg-emerald-50' : w === wahl ? 'border-red-500 bg-red-50' : 'bg-[#F6F7F9] opacity-60';
            return <button key={w} type="button" onClick={() => tippe(w)} className={`rounded-xl border-2 px-4 py-3 text-xl font-semibold ${farbe}`}>{w}</button>;
          })}
        </div>
        <p className="text-center text-sm text-[#9AA1AE]">Dieses Paar: {stand[akt] || 0} von {ZIEL} richtig</p>
      </>}
    </div>
  );
}