import React from 'react';
import { VolumeX, Volume1, Volume2 } from 'lucide-react';
import { LAUTSTAERKE } from '@/lib/lautstaerke';

const ICON = { still: VolumeX, fluestern: Volume1, achten: Volume2 };

/** Symbol einer Lautstärke-Stufe; mit onClick wird es zum Umschalter der Lehrkraft. */
export default function LautstaerkeSymbol({ stufe, onClick }) {
  const s = LAUTSTAERKE[stufe];
  const Icon = ICON[stufe];
  return (
    <button type="button" onClick={onClick} title={onClick ? `${s.name} · tippen zum Wechseln` : s.name}
      className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: s.hg, color: s.text, cursor: onClick ? 'pointer' : 'default' }}>
      <Icon className="h-5 w-5" />
    </button>
  );
}