import React from 'react';
import PartnerAnalogBild from './standard/PartnerAnalogBild';
import { Hand, Users, Network, User } from 'lucide-react';
import { CI_TIMER } from '@/lib/folienCI';
import ArbeitsphaseTafel from './tafel/ArbeitsphaseTafel';
import TafelVorschau from './tafel/TafelVorschau';
import AnalogArbeitsTafel from './tafel/AnalogArbeitsTafel';

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
  if (art === 'arbeitsphase_analog') return ansicht === 'schueler' ? <p className="text-xs">Kein Gerät · die Aufgabe steht an der Tafel</p> : <TafelVorschau><AnalogArbeitsTafel /></TafelVorschau>;
  if (art === 'einzelphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabe auf dem Gerät · oben rechts <User className="inline h-3 w-3" /> {timer}</p> : <TafelVorschau><ArbeitsphaseTafel sozialform="EA" /></TafelVorschau>;
  if (art === 'partnerphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabe auf dem Gerät · oben rechts <Users className="inline h-3 w-3" />7 {timer}</p> : <TafelVorschau><ArbeitsphaseTafel sozialform="PA" /></TafelVorschau>;
  return ansicht === 'schueler' ? <p className="text-xs">Aufgabe auf dem Gerät · oben rechts <Network className="inline h-3 w-3" />B {timer}</p> : <TafelVorschau><ArbeitsphaseTafel sozialform="GA" /></TafelVorschau>;
}