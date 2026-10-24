import React from 'react';
import { Check } from 'lucide-react';

/** Gemeinsamer Tablet-Rahmen: Fortschritt bei mehrschrittigen Aufgaben („Schritt 2 von 3“). */
export default function SchrittFortschritt({ schritt, schritte }) {
  return (
    <div className="mb-4 flex shrink-0 items-center gap-3 pr-16">
      <span className="text-lg font-semibold text-[#3E5C8A]">Schritt {schritt} von {schritte}</span>
      <div className="flex flex-1 gap-2">
        {Array.from({ length: schritte }, (_, i) => (
          <div key={i} className={`flex h-7 flex-1 items-center justify-center rounded-full text-sm font-semibold ${i < schritt - 1 ? 'bg-[#2A4074] text-white' : i === schritt - 1 ? 'bg-[#F59E2B] text-white' : 'bg-[#E4E1DA] text-[#6A7181]'}`}>
            {i < schritt - 1 ? <Check className="h-4 w-4" /> : i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}