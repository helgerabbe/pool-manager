import React from 'react';
import { Layers } from 'lucide-react';

/** Platzhalter: Hier werden später mehrere Folien aus dem Unterricht eingefügt. */
export default function EinschubInhalt({ f }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-4 border-dashed border-[#C9CED8] bg-[#F6F7F9] p-8 text-center">
      <Layers className="h-16 w-16 text-[#6A7181]" />
      <h2 className="text-[36px] font-bold leading-tight text-[#2A4074]">{f.titel || 'Hier folgen die Folien des Unterrichts'}</h2>
      <p className="line-clamp-2 max-w-2xl text-[22px] text-[#6A7181]">{f.satz || 'Lehrerimpuls, Erarbeitung oder Übung werden hier eingefügt.'}</p>
      <span className="rounded-full bg-white px-4 py-1 text-base font-semibold text-[#6A7181]">Platzhalter · mehrere Folien</span>
    </div>
  );
}