import React from 'react';
import { Play, Volume2, Film } from 'lucide-react';
import { MATERIAL_TEXT, MATERIAL_BILD } from '@/lib/materialaufgabeBeispiel';

/** Zeigt das Material der Materialaufgabe je nach Art (Text, Bild, Audio, Film). */
export default function MaterialAnzeige({ art }) {
  if (art === 'text') return <p className="rounded-xl bg-[#F6F7F9] p-4 text-lg leading-relaxed text-[#121721]">{MATERIAL_TEXT}</p>;
  if (art === 'bild') return <img src={MATERIAL_BILD} alt="Bahnhof mit Zug" className="max-h-56 w-full rounded-xl object-cover" />;
  if (art === 'audio') return (
    <div className="flex items-center gap-3 rounded-xl bg-[#F6F7F9] p-4">
      <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2A4074] text-white"><Play className="h-5 w-5" /></button>
      <div className="h-2 flex-1 rounded-full bg-[#DCDFE4]"><div className="h-2 w-1/3 rounded-full bg-[#2A4074]" /></div>
      <span className="flex items-center gap-1 text-sm text-[#6A7181]"><Volume2 className="h-4 w-4" /> 0:45</span>
    </div>
  );
  return (
    <div className="flex aspect-video max-h-56 w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#121721] text-white">
      <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20"><Play className="h-7 w-7" /></button>
      <span className="flex items-center gap-1 text-sm text-white/70"><Film className="h-4 w-4" /> Film · 1:20</span>
    </div>
  );
}