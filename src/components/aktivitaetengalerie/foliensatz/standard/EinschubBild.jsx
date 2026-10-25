import React from 'react';

/** Standardfolie Platzhalter: Unterricht (für Methoden, die den Unterricht einrahmen). */
export default function EinschubBild({ ansicht }) {
  if (ansicht === 'schueler') return <p className="text-xs">Keine eigene Ansicht · hier laufen die Unterrichtsfolien</p>;
  return (
    <div className="flex h-24 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#7FA6D6] bg-white/70">
      <p className="text-sm font-bold text-[#7FA6D6]">Hier läuft der Unterricht</p>
      <p className="text-[10px] text-[#6A7181]">Danach: zweite Positionierung (Vorher-Nachher)</p>
    </div>
  );
}