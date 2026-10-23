import React from 'react';
import { PARTNER_ARTEN } from '@/lib/partnerSuche';
import SozialSymbol from './SozialSymbol';

/** Organisationsfolie „Partner finden“: Aquarellbild links, Art der Suche und ein Satz rechts. */
export default function PartnersucheInhalt({ f }) {
  const a = PARTNER_ARTEN[f.partnersuche] || PARTNER_ARTEN.frei;
  return (
    <div className="flex flex-1 items-center gap-10 pr-10">
      <img src={a.bild} alt="" className="h-[440px] w-[440px] shrink-0 rounded-[40px] object-cover" />
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4"><SozialSymbol form="PA" /><span className="text-xl font-semibold uppercase tracking-wide text-[#5B4E8C]">{a.name}</span></div>
        <h2 className="text-[44px] font-bold leading-tight">{f.titel || 'Partner finden'}</h2>
        <p className="text-[28px] leading-snug" style={{ textWrap: 'pretty' }}>{a.satz}</p>
      </div>
    </div>
  );
}