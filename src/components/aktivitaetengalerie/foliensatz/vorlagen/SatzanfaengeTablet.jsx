import React from 'react';
import { X } from 'lucide-react';
import { CI_BOXEN } from '@/lib/folienCI';

const auf = CI_BOXEN.aufgabe;
const ohnePunkte = (s) => s.replace(/\.{3}|…/g, '').trim();

/** Tablet: Satzanfang antippen = neues Textfeld mit diesem Anfang, der Schüler ergänzt den Satz. */
export default function SatzanfaengeTablet({ f }) {
  const [saetze, setSaetze] = React.useState([]);
  const impulse = (f.satzimpulse || []).slice(0, 4);
  const neu = (s) => setSaetze((l) => [...l, `${ohnePunkte(s)} `]);
  return (
    <div className="flex flex-1 flex-col gap-4 pr-16">
      <div className="rounded-xl border-2 px-5 py-3" style={{ background: auf.hg, borderColor: auf.rand, borderLeft: `6px solid ${auf.akzent}`, color: auf.text }}>
        <p className="text-[22px] font-semibold leading-snug">{f.inhalt || 'Wähle einen Satzanfang und ergänze ihn.'}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {impulse.map((s, i) => <button key={i} onClick={() => neu(s)} className="rounded-full border-2 border-[#9DBCE6] bg-[#E3EEFB] px-5 py-2 text-xl font-semibold text-[#1F3A64]">{ohnePunkte(s)} …</button>)}
      </div>
      <div className="flex min-h-[320px] flex-1 flex-col gap-3 rounded-xl border-2 border-[#C9CED8] bg-white p-5">
        {!saetze.length && <p className="text-xl text-[#9AA1AE]">Tippe oben auf einen Satzanfang. Er erscheint hier, und du schreibst den Satz zu Ende.</p>}
        {saetze.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <textarea autoFocus={i === saetze.length - 1} rows={2} value={s} onChange={(e) => setSaetze((l) => l.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1 resize-none rounded-lg border border-[#DCDFE4] p-3 text-xl outline-none" />
            <button title="Entfernen" onClick={() => setSaetze((l) => l.filter((_, j) => j !== i))} className="mt-2 text-[#9AA1AE]"><X className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}