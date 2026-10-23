import React from 'react';
import { Hand, Users, Network } from 'lucide-react';
import PartnerSchueler from './standard/PartnerSchueler';
import PartnerLehrer from './standard/PartnerLehrer';
import { CI_GRUPPEN } from '@/lib/folienCI';
import BegruessungBild from './standard/BegruessungBild';
import ZuhoerenBild from './standard/ZuhoerenBild';

const karte = 'rounded-lg border bg-white p-1.5 text-[10px]';

/** Skizze einer Standardfolie, je Ansicht (schueler | lehrer). */
export default function CiStandardBild({ art, ansicht }) {
  if (art === 'begruessung') return <BegruessungBild ansicht={ansicht} />;
  if (art === 'zuhoeren') return <ZuhoerenBild ansicht={ansicht} />;
  if (art === 'partner') return ansicht === 'schueler' ? <PartnerSchueler /> : <PartnerLehrer />;
  if (art === 'partnerphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <Users className="inline h-3 w-3" />7</p> : (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {[['1', 80, false], ['2', 40, true], ['3', 100, false]].map(([n, p, m]) => <div key={n} className={karte}><b className="flex items-center gap-0.5"><Users className="h-3 w-3" />{n}{m && <Hand className="ml-auto h-3 w-3 text-[#8A4B3C]" />}</b><div className="mt-1 h-1 rounded bg-[#E4E1DA]"><div className="h-1 rounded bg-[#7FA6D6]" style={{ width: `${p}%` }} /></div></div>)}
    </div>);
  return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <Network className="inline h-3 w-3" />B</p> : (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {CI_GRUPPEN.slice(0, 3).map((g) => <div key={g.kennung} className="rounded-lg p-2 text-[10px]" style={{ background: g.hg, color: g.text }}><b className="flex items-center gap-0.5"><Network className="h-3 w-3" />{g.kennung}</b>4 Mitglieder · 60 %</div>)}
    </div>);
}