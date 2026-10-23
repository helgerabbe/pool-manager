import React from 'react';
import { ABSTIMMUNG_ARTEN } from '@/lib/abstimmungArten';

const Titel = ({ children }) => <h2 className="line-clamp-1 text-[40px] font-bold leading-tight">{children}</h2>;
const BEWERTUNG = [['stimmt', '#2F7A4A'], ['teils', '#C98A1B'], ['stimmt nicht', '#B4483A']];

/** Abstimmung über die gesammelten Punkte: gewichten (mehrere Stimmen), bewerten (je Punkt), auswählen (eine Stimme). */
export default function AbstimmungInhalt({ f }) {
  const art = ABSTIMMUNG_ARTEN[f.abstimmung] || ABSTIMMUNG_ARTEN.gewichten;
  const punkte = (f.punkte?.length ? f.punkte : ['Punkt aus der Sammlung', 'Weiterer Punkt', 'Dritter Punkt']).slice(0, 6);
  const [stimmen, setStimmen] = React.useState({});
  const max = Math.max(1, ...Object.values(stimmen).map((v) => (typeof v === 'number' ? v : 0)));
  const plus = (i) => setStimmen((s) => (f.abstimmung === 'auswaehlen' ? { [i]: 1 } : { ...s, [i]: (s[i] || 0) + 1 }));

  return (
    <div className="flex flex-1 flex-col gap-4 pr-16">
      <div className="pr-32"><Titel>{f.titel}</Titel><p className="line-clamp-1 text-2xl text-[#3E5C8A]">{art.satz}</p></div>
      <div className="grid flex-1 grid-cols-2 content-start gap-3">
        {punkte.map((p, i) => (
          <div key={i} className="rounded-xl border-2 border-[#D8DEE9] bg-white p-3">
            <p className="line-clamp-1 text-xl font-semibold">{p}</p>
            {f.abstimmung === 'bewerten' ? (
              <div className="mt-2 flex gap-2">
                {BEWERTUNG.map(([l, c]) => (
                  <button key={l} onClick={() => setStimmen((s) => ({ ...s, [i]: l }))} className="flex-1 rounded-lg border-2 py-1 text-base font-semibold" style={{ borderColor: c, background: stimmen[i] === l ? c : 'white', color: stimmen[i] === l ? 'white' : c }}>{l}</button>
                ))}
              </div>
            ) : (
              <button onClick={() => plus(i)} className="mt-2 flex w-full items-center gap-2 text-left">
                <span className="h-5 flex-1 overflow-hidden rounded-full bg-[#EEF1F6]"><span className="block h-full bg-[#3E5C8A] transition-all" style={{ width: `${((stimmen[i] || 0) / max) * 100}%` }} /></span>
                <span className="w-8 text-right text-lg font-bold">{stimmen[i] || 0}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}