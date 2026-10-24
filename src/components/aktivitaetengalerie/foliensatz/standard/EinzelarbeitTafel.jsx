import React from 'react';
import { User, PlusCircle } from 'lucide-react';
import { useLautstaerke } from './LautstaerkeLeiste';
import { CI_SYMBOL_STIL, CI_TIMER } from '@/lib/folienCI';

const kreis = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

/** Tafel während der Einzelarbeit: ruhige Arbeitsfolie statt der ganzen Aufgabe. */
export default function EinzelarbeitTafel() {
  const laut = useLautstaerke('EA');
  return (
    <div className="flex w-full flex-col gap-2">
    <div className="flex w-full items-center gap-3 text-xs">
      <div className="flex flex-1 flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={kreis}><User className="h-5 w-5" /></span>
          {laut.symbol}{laut.schalter}
        </div>
        <p className="font-semibold">Jeder arbeitet für sich. {laut.satz}</p>
        <p className="text-[10px] text-[#6A7181]">Aufgabe: Zwei Gründe für den Umzug in die Stadt notieren</p>
        <p className="flex items-center gap-1 text-[10px] text-[#4A4170]"><PlusCircle className="h-3 w-3" />Fertig? Dann die Zusatzaufgabe.</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 text-sm font-bold" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text, borderColor: CI_TIMER.normal.ring }}>6:00</span>
        <span className="text-[10px]">12 von 24 fertig</span>
        <div className="h-1 w-16 rounded bg-[#E4E1DA]"><div className="h-1 w-1/2 rounded bg-[#7FA6D6]" /></div>
      </div>
    </div>
    {laut.ampel}
    </div>
  );
}