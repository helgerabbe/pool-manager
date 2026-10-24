import React from 'react';
import { CheckCircle2, Shuffle, RotateCcw } from 'lucide-react';

// Beispiel: Teile mit {Lösung} sind Lücken.
const BEISPIEL = 'Die Pflanze nimmt mit den {Wurzeln} Wasser auf. In den {Blättern} entsteht mit Hilfe von {Licht} Zucker. Dabei wird {Sauerstoff} abgegeben.';
const teile = BEISPIEL.split(/(\{[^}]+\})/).filter(Boolean);
const loesungen = teile.filter((t) => t.startsWith('{')).map((t) => t.slice(1, -1));
const bank = [...loesungen, 'Stängel'].sort();
const knopf = 'flex items-center gap-2 rounded-xl px-5 py-3 text-xl font-semibold';

/** Klassenmodus: Das Übungsformat liegt groß an der Tafel, die Klasse löst es gemeinsam. */
export default function KlassenLueckentextTafel() {
  const [wahl, setWahl] = React.useState(null);
  const [luecken, setLuecken] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const [dran, setDran] = React.useState(null);
  const benutzt = Object.values(luecken);
  const setzen = (i) => { if (wahl) { setLuecken({ ...luecken, [i]: wahl }); setWahl(null); } else if (luecken[i]) { const { [i]: _, ...rest } = luecken; setLuecken(rest); } setGeprueft(false); };
  let n = -1;
  return (
    <div className="flex h-full flex-col gap-6 p-10 font-folie text-[#121721]">
      <div className="flex items-center gap-3 pr-40">
        <h2 className="flex-1 text-[40px] font-bold">Wir füllen die Lücken gemeinsam</h2>
        {dran && <span className="rounded-full bg-[#FBE3CF] px-5 py-2 text-xl font-semibold text-[#8A4B1E]">Nr. {dran} kommt nach vorne</span>}
      </div>
      <p className="text-[32px] leading-[2.2]">
        {teile.map((t, k) => {
          if (!t.startsWith('{')) return <span key={k}>{t}</span>;
          n += 1; const i = n; const w = luecken[i];
          const farbe = !geprueft || !w ? 'border-[#2A4074] bg-white' : w === loesungen[i] ? 'border-emerald-600 bg-emerald-50' : 'border-red-500 bg-red-50';
          return <button key={k} onClick={() => setzen(i)} className={`mx-1 inline-block min-w-[180px] rounded-lg border-b-4 px-3 align-middle leading-tight ${farbe}`}>{w || '\u00a0'}</button>;
        })}
      </p>
      <div className="flex flex-wrap gap-3">
        {bank.filter((b) => !benutzt.includes(b)).map((b) => (
          <button key={b} onClick={() => setWahl(wahl === b ? null : b)} className={`rounded-xl border-2 px-6 py-3 text-2xl font-semibold ${wahl === b ? 'border-[#F59E2B] bg-[#FDEBD3]' : 'border-[#C9CED8] bg-white'}`}>{b}</button>
        ))}
      </div>
      <div className="mt-auto flex gap-3">
        <button onClick={() => setGeprueft(true)} className={`${knopf} bg-[#2A4074] text-white`}><CheckCircle2 className="h-6 w-6" />Lösung prüfen</button>
        <button onClick={() => setDran(1 + Math.floor(Math.random() * 24))} className={`${knopf} bg-[#DCE7F5] text-[#2A4074]`}><Shuffle className="h-6 w-6" />Zufallsschüler</button>
        <button onClick={() => { setLuecken({}); setGeprueft(false); setWahl(null); }} className={`${knopf} bg-white text-[#6A7181] border-2`}><RotateCcw className="h-6 w-6" />Neu beginnen</button>
      </div>
    </div>
  );
}