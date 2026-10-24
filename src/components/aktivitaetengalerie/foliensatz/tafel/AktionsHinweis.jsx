import React from 'react';
import { Eye, PauseCircle } from 'lucide-react';

const ART = {
  herschauen: { Icon: Eye, titel: 'Alle mal nach vorne schauen', info: 'Die Geräte sind gesperrt.', knopf: 'Geräte freigeben' },
  zwischenstopp: { Icon: PauseCircle, titel: 'Zwischenstopp', info: 'Der Timer ist angehalten.', knopf: 'Weiterarbeiten' },
};

/** Vollflächiger Zustand der Tafel nach „Alle herschauen“ oder „Zwischenstopp“. */
export default function AktionsHinweis({ art, onEnde }) {
  const { Icon, titel, info, knopf } = ART[art];
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-[#2A4074]/95 text-center text-white">
      <Icon className="h-10 w-10" />
      <p className="text-lg font-bold">{titel}</p>
      <p className="text-[10px] opacity-80">{info}</p>
      <button type="button" onClick={onEnde} className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-[#2A4074]">{knopf}</button>
    </div>
  );
}