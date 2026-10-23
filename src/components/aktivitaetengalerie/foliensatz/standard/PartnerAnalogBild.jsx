import React from 'react';
import { PARTNER_ARTEN } from '@/lib/partnerSuche';

/** Skizze der Standardfolie „Partner finden (analog)“: die vier Arten mit Aquarellbild. */
export default function PartnerAnalogBild() {
  return (
    <div className="grid w-full grid-cols-4 gap-1.5">
      {Object.entries(PARTNER_ARTEN).map(([k, a]) => (
        <div key={k} className="text-center text-[9px] font-semibold">
          <img src={a.bild} alt="" className="mb-0.5 aspect-square w-full rounded-lg object-cover" />{a.name}
        </div>
      ))}
    </div>
  );
}