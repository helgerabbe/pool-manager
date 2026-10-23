import React, { useState } from 'react';
import { Camera, RotateCw, GripVertical } from 'lucide-react';
import { CI_GRUND } from '@/lib/folienCI';
import { CI_ELEMENTE } from '@/lib/folienCIElemente';

const karte = 'rounded-xl border border-[#D6DCE5] bg-white px-2 py-1 text-[10px]';
const feld = 'flex h-28 flex-col justify-center rounded-xl p-2';

/** Vorschau Teil 14b: interaktive Elemente des Folien-Designers. */
export default function CiElementeVorschau() {
  const [gedreht, setGedreht] = useState(false);
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <button onClick={() => setGedreht(!gedreht)} className={`${feld} relative items-center border text-xs ${gedreht ? 'border-[#EBD9A0] bg-[#FBF3D5]' : 'border-[#D6DCE5] bg-white'}`}>
          {gedreht ? 'Metropole: Stadt über 1 Mio.' : 'Was ist eine Metropole?'}
          <RotateCw className="absolute bottom-2 right-2 h-3.5 w-3.5 text-[#9AA3B2]" />
        </button>
        <div className={`${feld} items-center gap-1 border-2 border-dashed border-[#C9C4B8] bg-[#F3F1EC] text-xs text-[#6A7181]`}><Camera className="h-5 w-5" />Foto aufnehmen</div>
        <div className={`${feld} gap-2`}>
          <div className="relative h-1.5 rounded-full bg-[#E4E1DA]">
            {[20, 35, 70].map((p) => <span key={p} className="absolute -top-0.5 h-2.5 w-2.5 rounded-full bg-[#B9D2EE]" style={{ left: `${p}%` }} />)}
            <span className="absolute -top-1.5 h-4 w-4 rounded-full bg-[#3E5C8A]" style={{ left: '55%' }} />
          </div>
          <div className="flex justify-between text-[10px] text-[#6A7181]"><span>gar nicht</span><span>sehr</span></div>
        </div>
        <div className="flex h-28 gap-1">
          {['Offen', 'Dran', 'Fertig'].map((s, i) => (
            <div key={s} className="flex-1 space-y-1 rounded-lg bg-[#F3F1EC] p-1 text-[10px] font-semibold">{s}{i < 2 && <div className={`${karte} font-normal`}>Karte</div>}</div>
          ))}
        </div>
        <div className="flex h-28 flex-col justify-center gap-1">
          {['Wurzel', 'Keimling', 'Blüte'].map((t, i) => (
            <div key={t} className={`${karte} flex items-center gap-1`}><GripVertical className="h-3 w-3 text-[#9AA3B2]" /><span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E3EEF9] text-[9px] text-[#1E3A6E]">{i + 1}</span>{t}</div>
          ))}
        </div>
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs">{CI_ELEMENTE.map((e) => <li key={e.typ}><b>{e.name}:</b> {e.regel}</li>)}</ul>
    </div>
  );
}