import React from 'react';
import { Gauge } from 'lucide-react';
import { LAUTSTAERKE, LAUTSTAERKE_JE_SOZIALFORM } from '@/lib/lautstaerke';
import LautstaerkeSymbol from './LautstaerkeSymbol';
import Laermampel from './Laermampel';

/** Interaktive Lautstärke an der Tafel: Symbol umschaltbar (zwei erlaubte Stufen je Sozialform), Lärmampel an/aus. */
export function useLautstaerke(sozialform) {
  const stufen = LAUTSTAERKE_JE_SOZIALFORM[sozialform];
  const [stufe, setStufe] = React.useState(stufen[0]);
  const [ampel, setAmpel] = React.useState(false);
  const wechseln = () => setStufe(stufen[(stufen.indexOf(stufe) + 1) % stufen.length]);
  return { stufe, satz: LAUTSTAERKE[stufe].satz, symbol: <LautstaerkeSymbol stufe={stufe} onClick={wechseln} />,
    schalter: <button type="button" onClick={() => setAmpel(!ampel)} title="Lärmampel ein-/ausblenden"
      className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${ampel ? 'bg-[#2A4074] text-white' : 'bg-white'}`}><Gauge className="h-3 w-3" />Lärmampel</button>,
    ampel: ampel && <Laermampel /> };
}