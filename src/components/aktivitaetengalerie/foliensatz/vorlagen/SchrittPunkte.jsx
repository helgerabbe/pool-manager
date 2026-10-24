import React from 'react';

/** Kompakter Schrittfortschritt für die Tablet-Kopfleiste: erledigt orange, aktuell dunkelblau, offen grau. */
export default function SchrittPunkte({ schritt = 1, schritte }) {
  return (
    <span className="flex items-center gap-1" title={`Schritt ${schritt} von ${schritte}`}>
      {Array.from({ length: schritte }, (_, i) => {
        const n = i + 1;
        const stil = n < schritt ? 'bg-[#F28C28] text-white' : n === schritt ? 'bg-[#2A4074] text-white ring-2 ring-[#2A4074]/30' : 'bg-[#E4E7EC] text-[#6A7181]';
        return <span key={n} className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${stil}`}>{n}</span>;
      })}
    </span>
  );
}