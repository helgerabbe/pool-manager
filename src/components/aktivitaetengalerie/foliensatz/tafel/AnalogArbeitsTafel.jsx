import React from 'react';
import { User, Users, Network } from 'lucide-react';
import { CI_SYMBOL_STIL, CI_TIMER } from '@/lib/folienCI';
import { useLautstaerke } from '../standard/LautstaerkeLeiste';
import Laermampel from '../standard/Laermampel';
import AktionsLeiste from './AktionsLeiste';
import AktionsHinweis from './AktionsHinweis';

const SOZIAL = [['EA', User, 'Einzelarbeit'], ['PA', Users, 'Partnerarbeit'], ['GA', Network, 'Gruppenarbeit']];

/** Analoge Funktionstafel „Arbeitsphase läuft“: Schüler haben keine Geräte, also steht die Aufgabe groß an der Tafel.
 *  Alles Steuernde liegt in der Kopfleiste: Sozialform, Lautstärke, Lärmampel, Aktionen, kleiner Timer. */
function Inhalt({ sozialform, setSozialform }) {
  const laut = useLautstaerke(sozialform);
  const [zeit, setZeit] = React.useState(480);
  const [hinweis, setHinweis] = React.useState(null);
  const t = zeit <= 60 ? CI_TIMER.bald : CI_TIMER.normal;
  const aktion = (k) => {
    if (k === 'zeit_plus') setZeit((z) => z + 120);
    if (k === 'endspurt') setZeit(60);
    if (k === 'herschauen' || k === 'zwischenstopp') setHinweis(k);
  };
  return (
    <div className="relative flex h-full w-full flex-col gap-3 overflow-hidden p-4 text-xs">
      <div className="flex items-center gap-2 pr-[12%]">
        {SOZIAL.map(([k, Icon, name]) => (
          <button key={k} type="button" title={name} onClick={() => setSozialform(k)}
            className={`flex h-10 w-10 items-center justify-center rounded-full ${sozialform === k ? '' : 'opacity-30'}`}
            style={{ background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe }}><Icon className="h-6 w-6" /></button>
        ))}
        {laut.symbol}
        <div className="w-40"><Laermampel /></div>
        <div className="flex-1"><AktionsLeiste sozialform={sozialform} analog onAktion={aktion} /></div>
      </div>
      <span className="absolute right-4 top-3 z-[2] flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold"
        style={{ background: t.hg, color: t.text, borderColor: t.ring }}>{Math.floor(zeit / 60)}:{String(zeit % 60).padStart(2, '0')}</span>
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border-4 border-dashed border-[#7FA6D6] bg-white/70">
        <p className="text-4xl font-bold text-[#7FA6D6]">Hier steht die Aufgabe</p>
      </div>
      {hinweis && <AktionsHinweis art={hinweis} onEnde={() => setHinweis(null)} />}
    </div>
  );
}

export default function AnalogArbeitsTafel() {
  const [sozialform, setSozialform] = React.useState('EA');
  return <Inhalt key={sozialform} sozialform={sozialform} setSozialform={setSozialform} />;
}