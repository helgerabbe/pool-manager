import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw } from 'lucide-react';
import SozialSymbol from '../vorlagen/SozialSymbol';
import useEinpassen from './useEinpassen';

// Beispiel: Teile mit {Lösung} sind Lücken.
const BEISPIEL = 'Die Pflanze nimmt mit den {Wurzeln} Wasser auf. In den {Blättern} entsteht mit Hilfe von {Licht} Zucker. Dabei wird {Sauerstoff} abgegeben.';
const teile = BEISPIEL.split(/(\{[^}]+\})/).filter(Boolean);
const loesungen = teile.filter((t) => t.startsWith('{')).map((t) => t.slice(1, -1));
const bank = [...loesungen, 'Stängel'].sort();
const knopf = 'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';

/** Übung an der Tafel: kompakte Kopfleiste, Inhalt passt sich ohne Tafel-Scrollen ein. */
export default function KlassenLueckentextTafel() {
  const [wahl, setWahl] = React.useState(null);
  const [luecken, setLuecken] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const benutzt = Object.values(luecken);
  const [textRef, schrift] = useEinpassen(30, [luecken]);
  const [bankRef] = useEinpassen(22, [luecken]);
  const setzen = (i) => { if (wahl) { setLuecken({ ...luecken, [i]: wahl }); setWahl(null); } else if (luecken[i]) { const { [i]: _, ...rest } = luecken; setLuecken(rest); } setGeprueft(false); };
  let n = -1;
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden px-6 pb-4 pt-3 font-folie text-[#121721]">
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-base font-bold text-[#2A4074]">Lückentext</span>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-3 py-0.5 text-sm font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
        <span className="ml-auto origin-right scale-75"><SozialSymbol form="PL" /></span>
      </div>
      <div ref={textRef} className="min-h-0 flex-1 overflow-y-auto leading-[2.1]">
        {teile.map((t, k) => {
          if (!t.startsWith('{')) return <span key={k}>{t}</span>;
          n += 1; const i = n; const w = luecken[i];
          const farbe = !geprueft || !w ? 'border-[#2A4074] bg-white' : w === loesungen[i] ? 'border-emerald-600 bg-emerald-50' : 'border-red-500 bg-red-50';
          return <button key={k} onClick={() => setzen(i)} style={{ minWidth: schrift * 5 }} className={`mx-1 inline-block rounded-md border-b-4 px-2 align-middle leading-tight ${farbe}`}>{w || '\u00a0'}</button>;
        })}
      </div>
      <div ref={bankRef} className="flex max-h-[25%] shrink-0 flex-wrap gap-2 overflow-y-auto rounded-lg border-2 border-dashed border-[#C9CED8] p-2">
        {bank.filter((b) => !benutzt.includes(b)).map((b) => (
          <button key={b} onClick={() => setWahl(wahl === b ? null : b)} className={`rounded-lg border-2 px-3 py-1 font-semibold ${wahl === b ? 'border-[#F59E2B] bg-[#FDEBD3]' : 'border-[#C9CED8] bg-white'}`}>{b}</button>
        ))}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-4 w-4" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-4 w-4" />Zufallsschüler</button>
        <button onClick={() => { setLuecken({}); setGeprueft(false); setWahl(null); }} className={`${knopf} border-2 bg-white text-[#6A7181]`}><RotateCcw className="h-4 w-4" />Neu beginnen</button>
      </div>
    </div>
  );
}