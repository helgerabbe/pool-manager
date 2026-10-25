import ImpulsSetzenTafel from './standard/ImpulsSetzenTafel';
import React from 'react';
import PartnerAnalogBild from './standard/PartnerAnalogBild';
import { Hand, Users, Network, User } from 'lucide-react';
import { CI_TIMER } from '@/lib/folienCI';
import ArbeitsphaseTafel from './tafel/ArbeitsphaseTafel';
import TafelVorschau from './tafel/TafelVorschau';
import AnalogArbeitsTafel from './tafel/AnalogArbeitsTafel';
import KlassenLueckentextTafel from './tafel/KlassenLueckentextTafel';
import LueckentextTablet from './standard/LueckentextTablet';
import KlassenZuordnenTafel from './tafel/KlassenZuordnenTafel';
import KlassenReihenfolgeTafel from './tafel/KlassenReihenfolgeTafel';
import KlassenRichtigFalschTafel from './tafel/KlassenRichtigFalschTafel';
import KlassenMultipleChoiceTafel from './tafel/KlassenMultipleChoiceTafel';
import KlassenBildbeschriftungTafel from './tafel/KlassenBildbeschriftungTafel';

const timer = <span className="rounded-full px-1.5 font-semibold" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text }}>4:30</span>;
import PartnerSchueler from './standard/PartnerSchueler';
import PartnerLehrer from './standard/PartnerLehrer';
import { CI_GRUPPEN } from '@/lib/folienCI';
import BegruessungBild from './standard/BegruessungBild';
import ZuhoerenBild from './standard/ZuhoerenBild';
import AufgabenerklaerungBild from './standard/AufgabenerklaerungBild';
import LernortBild from './standard/LernortBild';
import ReflexionBild from './standard/ReflexionBild';
import StartBild from './standard/StartBild';
import AnkuendigungBild from './standard/AnkuendigungBild';
import PositionierungBild from './standard/PositionierungBild';
import ProContraBild from './standard/ProContraBild';
import EinschubBild from './standard/EinschubBild';
import IrritierenBild from './standard/IrritierenBild';
import SammlungBild from './standard/SammlungBild';
import KartenabfrageBild from './standard/KartenabfrageBild';
import AbstimmungBild from './standard/AbstimmungBild';

const karte = 'rounded-lg border bg-white p-1.5 text-[10px]';

/** Skizze einer Standardfolie, je Ansicht (schueler | lehrer). */
export default function CiStandardBild({ art, ansicht }) {
  if (art === 'ankuendigung') return <AnkuendigungBild />;
  if (art === 'positionierung') return <PositionierungBild ansicht={ansicht} />;
  if (art === 'abstimmung') return <AbstimmungBild ansicht={ansicht} />;
  if (art === 'kartenabfrage') return <KartenabfrageBild ansicht={ansicht} />;
  if (art === 'sammlung') return <SammlungBild ansicht={ansicht} />;
  if (art === 'sammlung_procontra') return <ProContraBild ansicht={ansicht} />;
  if (art === 'einschub') return <EinschubBild ansicht={ansicht} />;
  if (art === 'irritieren') return <IrritierenBild ansicht={ansicht} />;
  if (art === 'impuls') return <div className="relative aspect-video w-full"><ImpulsSetzenTafel /></div>;
  if (art === 'begruessung') return <BegruessungBild ansicht={ansicht} />;
  if (art === 'start') return <StartBild ansicht={ansicht} />;
  if (art === 'reflexion') return <ReflexionBild ansicht={ansicht} />;
  if (art === 'lernort') return <LernortBild ansicht={ansicht} />;
  if (art === 'aufgabenerklaerung') return <AufgabenerklaerungBild ansicht={ansicht} />;
  if (art === 'zuhoeren') return <ZuhoerenBild ansicht={ansicht} />;
  if (art === 'partner_analog') return <PartnerAnalogBild />;
  if (art === 'partner') return ansicht === 'schueler' ? <PartnerSchueler /> : <PartnerLehrer />;
  if (art === 'klassenmodus') return ansicht === 'schueler' ? <p className="text-xs">Kein Gerät · die Klasse löst gemeinsam an der Tafel</p> : <div className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#7FA6D6] bg-white/70"><p className="text-sm font-bold text-[#7FA6D6]">Hier liegt die Übung, die wir gemeinsam lösen</p></div>;
  if (art === 'lueckentext') return ansicht === 'schueler' ? <LueckentextTablet /> : <TafelVorschau><KlassenLueckentextTafel /></TafelVorschau>;
  if (art === 'bildbeschriftung') return <TafelVorschau><KlassenBildbeschriftungTafel /></TafelVorschau>;
  if (art === 'multiple_choice') return <TafelVorschau scroll><KlassenMultipleChoiceTafel /></TafelVorschau>;
  if (art === 'richtig_falsch') return <TafelVorschau scroll><KlassenRichtigFalschTafel /></TafelVorschau>;
  if (art === 'reihenfolge') return <TafelVorschau><KlassenReihenfolgeTafel /></TafelVorschau>;
  if (art === 'zuordnen') return <TafelVorschau><KlassenZuordnenTafel /></TafelVorschau>;
  if (art === 'arbeitsphase_analog') return ansicht === 'schueler' ? <p className="text-xs">Kein Gerät · die Aufgabe steht an der Tafel</p> : <TafelVorschau><AnalogArbeitsTafel /></TafelVorschau>;
  if (art === 'einzelphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabe auf dem Gerät · oben rechts <User className="inline h-3 w-3" /> {timer}</p> : <TafelVorschau><ArbeitsphaseTafel sozialform="EA" /></TafelVorschau>;
  if (art === 'partnerphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabe auf dem Gerät · oben rechts <Users className="inline h-3 w-3" />7 {timer}</p> : <TafelVorschau><ArbeitsphaseTafel sozialform="PA" /></TafelVorschau>;
  return ansicht === 'schueler' ? <p className="text-xs">Aufgabe auf dem Gerät · oben rechts <Network className="inline h-3 w-3" />B {timer}</p> : <TafelVorschau><ArbeitsphaseTafel sozialform="GA" /></TafelVorschau>;
}