import React from 'react';
import { Ear, Hand, Users, Network, CheckCircle2 } from 'lucide-react';
import { CI_GRUPPEN } from '@/lib/folienCI';
import BegruessungBild from './standard/BegruessungBild';
import ZuhoerenBild from './standard/ZuhoerenBild';

const karte = 'rounded-lg border bg-white p-1.5 text-[10px]';

/** Skizze einer Standardfolie, je Ansicht (schueler | lehrer). */
export default function CiStandardBild({ art, ansicht }) {
  if (art === 'begruessung') return <BegruessungBild ansicht={ansicht} />;
  if (art === 'zuhoeren') return <ZuhoerenBild ansicht={ansicht} />;
  if (art === 'partner' && ansicht === 'schueler') return (
    <div className="w-48 space-y-2 text-xs"><p className="font-semibold">Such dir einen Partner.</p>
      <div className="rounded-lg border border-[#D6DCE5] bg-white px-2 py-1 text-[#9AA3B2]">Mit wem arbeitest du? Lea …</div>
      <div className="flex items-center gap-1 rounded-lg bg-[#DCEBE1] px-2 py-1 text-[#24553A]"><CheckCircle2 className="h-3.5 w-3.5" />Ihr seid Partner <Users className="h-3 w-3" />7</div></div>);
  if (art === 'partner') return (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {[['1', 'Lea · Tim'], ['2', 'Ali · Mia']].map(([n, t]) => <div key={n} className={karte}><b className="flex items-center gap-0.5"><Users className="h-3 w-3" />{n}</b>{t}</div>)}
      <div className={`${karte} border-dashed text-[#6A7181]`}>Ben → Noah ?</div>
      <div className="col-span-3 rounded-lg bg-[#EEF0F3] p-1 text-[10px] text-[#6A7181]">Ohne Partner: Jonas, Ella</div>
    </div>);
  if (art === 'partnerphase') return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <Users className="inline h-3 w-3" />7</p> : (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {[['1', 80, false], ['2', 40, true], ['3', 100, false]].map(([n, p, m]) => <div key={n} className={karte}><b className="flex items-center gap-0.5"><Users className="h-3 w-3" />{n}{m && <Hand className="ml-auto h-3 w-3 text-[#8A4B3C]" />}</b><div className="mt-1 h-1 rounded bg-[#E4E1DA]"><div className="h-1 rounded bg-[#7FA6D6]" style={{ width: `${p}%` }} /></div></div>)}
    </div>);
  return ansicht === 'schueler' ? <p className="text-xs">Aufgabenfolie · oben rechts <Network className="inline h-3 w-3" />B</p> : (
    <div className="grid w-full grid-cols-3 gap-1.5">
      {CI_GRUPPEN.slice(0, 3).map((g) => <div key={g.kennung} className="rounded-lg p-2 text-[10px]" style={{ background: g.hg, color: g.text }}><b className="flex items-center gap-0.5"><Network className="h-3 w-3" />{g.kennung}</b>4 Mitglieder · 60 %</div>)}
    </div>);
}