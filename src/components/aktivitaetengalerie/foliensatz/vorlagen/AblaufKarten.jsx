import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CI_TEXTFELD } from '@/lib/folienCI';
import SozialSymbol from './SozialSymbol';

// Ablaufkarten (Teil 16): 2-4 gleich große Karten nebeneinander mit Pfeil dazwischen.
// Kopf je Karte: Sozialform-Symbol (Phasen) ODER Nummer (Schritte, Abteilungen, Stationen).
const Kopf = ({ k, i, klein }) => k.sozialform
  ? <SozialSymbol form={k.sozialform} mitName />
  : <span className={`flex items-center justify-center rounded-full border-2 border-[#1F2A44] bg-[#E3EBF7] font-bold text-[#1F2A44] ${klein ? 'h-8 w-8 text-sm' : 'h-12 w-12 text-2xl'}`}>{k.nummer || i + 1}</span>;

export default function AblaufKarten({ karten = [], klein = false }) {
  return (
    <div className={`flex flex-1 items-center ${klein ? 'gap-2' : 'gap-3'}`}>
      {karten.slice(0, 4).map((k, i, a) => (
        <React.Fragment key={i}>
          <div className={`flex h-full flex-1 flex-col items-center rounded-xl border-2 bg-white text-center ${klein ? 'gap-1.5 p-3' : 'gap-3 p-5'}`} style={{ borderColor: CI_TEXTFELD.rand }}>
            <Kopf k={k} i={i} klein={klein} />
            <p className={`line-clamp-1 font-semibold text-[#3E5C8A] ${klein ? 'text-base' : 'text-[28px]'}`}>{k.name}</p>
            <p className={`leading-snug ${klein ? 'line-clamp-3 text-xs' : 'line-clamp-3 text-lg'}`}>{k.satz}</p>
          </div>
          {i < a.length - 1 && <ArrowRight className={`shrink-0 text-[#9AA3B2] ${klein ? 'h-4 w-4' : 'h-8 w-8'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}