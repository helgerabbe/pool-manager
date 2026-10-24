import React from 'react';
import { Eye, PauseCircle, Plus, Hourglass, Lightbulb, Shuffle } from 'lucide-react';
import { aktionenFuer } from '@/lib/tafelWerkzeuge';

const ICON = { herschauen: Eye, zwischenstopp: PauseCircle, zeit_plus: Plus, endspurt: Hourglass, tipp: Lightbulb, zufall: Shuffle };

/** Aktionsknöpfe oben rechts: wirken einmalig, sind dezent und stören die Anzeige nicht. */
export default function AktionsLeiste({ sozialform, onAktion }) {
  return (
    <div className="flex gap-1">
      {aktionenFuer(sozialform).map((a) => {
        const Icon = ICON[a.key];
        return (
          <button key={a.key} type="button" onClick={() => onAktion(a.key)} title={a.name}
            className="flex flex-col items-center gap-0.5 rounded-md border bg-white px-1.5 py-1 text-[8px] text-[#2A4074] hover:bg-[#E6EEF8]">
            <Icon className="h-3.5 w-3.5" />{a.name}
          </button>
        );
      })}
    </div>
  );
}