import React from 'react';
import PartnerAnalogBild from './standard/PartnerAnalogBild';
import { Hand, Users, Network, User } from 'lucide-react';
import { CI_TIMER } from '@/lib/folienCI';
import EinzelarbeitTafel from './standard/EinzelarbeitTafel';

const timer = <span className="rounded-full px-1.5 font-semibold" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text }}>4:30</span>;
import PartnerSchueler from './standard/PartnerSchueler';
import PartnerLehrer from './standard/PartnerLehrer';
import { CI_GRUPPEN } from '@/lib/folienCI';
import BegruessungBild from './standard/BegruessungBild';
import ZuhoerenBild from './standard/ZuhoerenBild';
import LernortBild from './standard/LernortBild';
import ReflexionBild from './standard/ReflexionBild';
import StartBild from './standard/StartBild';
import AnkuendigungBild from './standard/AnkuendigungBild';

const karte = 'rounded-lg border bg-white p-1.5 text-[10px]';

/** Skizze einer Standardfolie, je Ansicht (schueler | lehrer). */
export default function CiStandardBild({ art, ansicht }) {
  if (art === 'ankuendigung') return <AnkuendigungBild />;
  if (art === 'begruessung') return <BegruessungBild ansicht={ansicht} />;
  if (art === 'start') return <StartBild ansicht={ansicht} />;
  if (art === 'reflexion') return <ReflexionBild ansicht={ansicht} />;
  if (art === 'lernort') return <LernortBild ansicht={ansicht} />;
  if (art === 'zuhoeren') return <ZuhoerenBild ansicht={ansicht} />;
  if (art === 'partner_analog') return <PartnerAnalogBild />;
  if (art === 'partner') return ansicht === 'schueler' ? <PartnerSchueler /> : <PartnerLehrer />;
  if (art === 'einzelphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <User className="inline h-3 w-3" /> {timer}</p> : <EinzelarbeitTafel />;
  if (art === 'partnerphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <Users className="inline h-3 w-3" />7 {timer}</p> : (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {[['1', 80, false], ['2', 40, true], ['3', 100, false]].map(([n, p, m]) => <div key={n} className={karte}><b className="flex items-center gap-0.5"><Users className="h-3 w-3" />{n}{m && <Hand className="ml-auto h-3 w-3 text-[#8A4B3C]" />}</b><div className="mt-1 h-1 rounded bg-[#E4E1DA]"><div className="h-1 rounded bg-[#7FA6D6]" style={{ width: `${p}%` }} /></div></div>)}
    </div>);
  return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <Network className="inline h-3 w-3" />B {timer}</p> : (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {CI_GRUPPEN.slice(0, 3).map((g) => <div key={g.kennung} className="rounded-lg p-2 text-[10px]" style={{ background: g.hg, color: g.text }}><b className="flex items-center gap-0.5"><Network className="h-3 w-3" />{g.kennung}</b>4 Mitglieder · 60 %</div>)}
    </div>);
}