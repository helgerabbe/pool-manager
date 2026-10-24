import React from 'react';
import { User, Users, Network, Lightbulb, Shuffle, Star } from 'lucide-react';
import { CI_SYMBOL_STIL, CI_GRUPPEN } from '@/lib/folienCI';
import { startWerkzeuge } from '@/lib/tafelWerkzeuge';
import { useLautstaerke } from '../standard/LautstaerkeLeiste';
import useTeamRueckmeldung from '../standard/useTeamRueckmeldung';
import Laermampel from '../standard/Laermampel';
import WerkzeugMenue from './WerkzeugMenue';
import AktionsLeiste from './AktionsLeiste';
import AktionsHinweis from './AktionsHinweis';
import HilfeWarteschlange from './HilfeWarteschlange';
import Stimmungsbarometer from './Stimmungsbarometer';
import TafelTimer from './TafelTimer';
import TafelFortschritt from './TafelFortschritt';

const SATZ = { EA: 'Jeder arbeitet für sich.', PA: 'Ihr arbeitet zu zweit.', GA: 'Ihr arbeitet in eurer Gruppe.' };
const SYMBOL = { EA: User, PA: Users, GA: Network };
const PAARE = [['1', 100], ['2', 40], ['3', 80], ['4', 100], ['5', 20], ['6', 60]].map(([n, p]) => ({ n, p }));
const GRUPPEN = CI_GRUPPEN.slice(0, 4).map((g, i) => ({ n: g.kennung, p: [100, 60, 30, 80][i], g }));
const chip = 'flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] border';

/** Digitale Funktionstafel für Arbeitsphasen: Die Aufgabe steht auf den Schülergeräten,
 *  die Tafel zeigt groß nur Sozialform + Lautstärke. Anzeigen im Menü oben links, Aktionen oben rechts. */
export default function ArbeitsphaseTafel({ sozialform }) {
  const team = sozialform !== 'EA';
  const teams = sozialform === 'PA' ? PAARE : sozialform === 'GA' ? GRUPPEN : null;
  const [an, setAn] = React.useState(() => startWerkzeuge(sozialform));
  const [zeit, setZeit] = React.useState(480);
  const [hinweis, setHinweis] = React.useState(null);
  const [tipps, setTipps] = React.useState(0);
  const [auswahl, setAuswahl] = React.useState(null);
  const laut = useLautstaerke(sozialform);
  const rm = useTeamRueckmeldung(sozialform === 'GA' ? 'Gruppe' : 'Paar', an.rueckmeldung);
  const Symbol = SYMBOL[sozialform];
  const fertig = teams ? teams.filter((t) => t.p === 100).length : 12;

  const aktion = (k) => {
    if (k === 'zeit_plus') setZeit((z) => z + 120);
    if (k === 'endspurt') setZeit(60);
    if (k === 'tipp') setTipps((t) => t + 1);
    if (k === 'zufall') setAuswahl(teams[Math.floor(Math.random() * teams.length)].n);
    if (k === 'herschauen' || k === 'zwischenstopp') setHinweis(k);
  };

  return (
    <div className="relative flex w-full flex-col gap-2 rounded-lg bg-[#FAF8F4] p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <WerkzeugMenue sozialform={sozialform} an={an} setAn={setAn} />
        <AktionsLeiste sozialform={sozialform} onAktion={aktion} />
      </div>
      <div className="flex items-center gap-3 py-1">
        <div className="flex flex-1 flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe }}><Symbol className="h-6 w-6" /></span>
            {laut.symbol}
          </div>
          <p className="text-base font-bold leading-tight">{SATZ[sozialform]} {laut.satz}</p>
          <div className="flex flex-wrap justify-center gap-1">
            {tipps > 0 && <span className={chip}><Lightbulb className="h-3 w-3 text-[#C98A12]" />Tipp {tipps} ist freigeschaltet</span>}
            {auswahl && <span className={chip}><Shuffle className="h-3 w-3" />Als Erstes: {sozialform === 'GA' ? 'Gruppe' : 'Paar'} {auswahl}</span>}
            {an.klassenziel && <span className={chip}><Star className="h-3 w-3 fill-[#C98A12] text-[#C98A12]" />Klassenziel: {rm.gesamt} von 10 Sternen</span>}
          </div>
        </div>
        {an.timer && <div className="flex flex-col items-center gap-1"><TafelTimer sekunden={zeit} />{an.fortschritt && <span className="text-[10px]">{fertig} von {teams ? teams.length : 24} fertig</span>}</div>}
      </div>
      {an.fortschritt && <TafelFortschritt teams={teams} gruppe={sozialform === 'GA'} an={an} rm={rm} />}
      {rm.vorschau}
      {an.warteschlange && <HilfeWarteschlange team={team} />}
      {an.laermampel && <Laermampel />}
      {an.stimmung && <Stimmungsbarometer />}
      {hinweis && <AktionsHinweis art={hinweis} onEnde={() => setHinweis(null)} />}
    </div>
  );
}