import React from 'react';
import { Eye, PauseCircle, Plus, Hourglass, Lightbulb, Shuffle } from 'lucide-react';
import { aktionenFuer } from '@/lib/tafelWerkzeuge';

const ICON = { herschauen: Eye, zwischenstopp: PauseCircle, zeit_plus: Plus, endspurt: Hourglass, tipp: Lightbulb, zufall: Shuffle };

/** Schmale Kopfleiste mit den Aktionen: nur für die Lehrkraft, deshalb klein und dezent. */
export default function AktionsLeiste({ sozialform, analog, onAktion }) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {aktionenFuer(sozialform, analog).map((a) => {
        const Icon = ICON[a.key];
        return (
          <button key={a.key} type="button" onClick={() => onAktion(a.key)} title={a.name}
            className="flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[9px] text-[#2A4074] hover:bg-[#E6EEF8]">
            <Icon className="h-3 w-3" />{a.name}
          </button>
        );
      })}
    </div>
  );
}