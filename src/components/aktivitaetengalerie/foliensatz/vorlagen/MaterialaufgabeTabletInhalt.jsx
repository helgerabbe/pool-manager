import React from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { MATERIAL_ARTEN, MATERIAL_FRAGEN, istRichtig } from '@/lib/materialaufgabeBeispiel';
import MaterialAnzeige from './MaterialAnzeige';

const wahl = (an) => `rounded-lg border-2 px-3 py-1.5 text-base font-semibold ${an ? 'border-[#2A4074] bg-[#E8EDF7] text-[#2A4074]' : 'border-[#DCDFE4] bg-white text-[#121721]'}`;

/** Materialaufgabe (Skizze): Material oben (Art umschaltbar), darunter Fragen mit Lösung prüfen. */
export default function MaterialaufgabeTabletInhalt() {
  const [art, setArt] = React.useState('text');
  const [antw, setAntw] = React.useState({});
  const [geprueft, setGeprueft] = React.useState(false);
  const setze = (id, w) => { setGeprueft(false); setAntw((a) => ({ ...a, [id]: w })); };
  const rahmen = (f) => !geprueft ? '' : istRichtig(f, antw[f.id]) ? 'ring-2 ring-emerald-400' : 'ring-2 ring-red-300';
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 overflow-hidden rounded-xl border-2 border-[#C9CED8] bg-white p-4">
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex gap-1 self-end text-xs">
          {MATERIAL_ARTEN.map((m) => <button key={m.key} type="button" onClick={() => setArt(m.key)} className={`rounded-full px-2 py-0.5 ${art === m.key ? 'bg-[#2A4074] text-white' : 'bg-[#F6F7F9] text-[#6A7181]'}`}>{m.label}</button>)}
        </div>
        <div className="min-h-0 overflow-y-auto"><MaterialAnzeige art={art} /></div>
      </div>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      {MATERIAL_FRAGEN.map((f, i) => (
        <div key={f.id} className={`rounded-xl bg-[#F6F7F9] p-2.5 ${rahmen(f)}`}>
          <p className="mb-1.5 text-base font-semibold text-[#121721]">{i + 1}. {f.frage}</p>
          {f.art === 'kurz' && <input value={antw[f.id] || ''} onChange={(e) => setze(f.id, e.target.value)} placeholder="Deine Antwort …" className="w-full rounded-lg border-2 border-[#DCDFE4] px-3 py-1.5 text-base outline-none" />}
          {f.art !== 'kurz' && <div className="flex flex-wrap gap-2">{(f.optionen || ['Richtig', 'Falsch']).map((o) => <button key={o} type="button" onClick={() => setze(f.id, o)} className={wahl(antw[f.id] === o)}>{o}</button>)}</div>}
        </div>
      ))}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setGeprueft(true)} className="flex items-center gap-1 rounded-lg bg-[#2A4074] px-4 py-2 font-semibold text-white"><Check className="h-4 w-4" /> Prüfen</button>
        {geprueft && <span className="text-base text-[#6A7181]">{MATERIAL_FRAGEN.filter((f) => istRichtig(f, antw[f.id])).length} von {MATERIAL_FRAGEN.length} richtig</span>}
        <button type="button" onClick={() => { setAntw({}); setGeprueft(false); }} className="ml-auto flex items-center gap-1 text-sm text-[#6A7181]"><RotateCcw className="h-4 w-4" /> Neu</button>
      </div>
      </div>
    </div>
  );
}