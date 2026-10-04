import React from 'react';
import { X } from 'lucide-react';
import { officeVorschau } from '@/lib/materialOeffnen';

/** Vollflächige Vorschau eines Materials im Lehrer-Player. */
export default function MaterialVorschau({ datei, onSchliessen }) {
  const office = datei.art === 'powerpoint' || datei.art === 'word';
  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-2 text-sm text-white/80">
        <span className="truncate">{datei.name}</span>
        <button onClick={onSchliessen} className="text-white hover:text-white/70"><X className="h-5 w-5" /></button>
      </div>
      {datei.art === 'bild'
        ? <img src={datei.url} alt={datei.name} className="min-h-0 flex-1 object-contain" />
        : <iframe title={datei.name} src={office ? officeVorschau(datei.url) : datei.url} className="flex-1 border-0 bg-white" allowFullScreen />}
    </div>
  );
}