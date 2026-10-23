import React, { useState } from 'react';
import { CheckCircle2, Users, User, UsersRound } from 'lucide-react';

const zusatz = 'flex items-center gap-1 rounded-full border border-[#D6DCE5] bg-white px-2 py-0.5 text-[10px] text-[#4B5565]';

/** Partner finden – Schüleransicht mit Zusatzoptionen „zu dritt“ und „allein“. */
export default function PartnerSchueler() {
  const [wahl, setWahl] = useState('paar');
  const ergebnis = {
    paar: <><CheckCircle2 className="h-3.5 w-3.5" />Ihr seid Partner <Users className="h-3 w-3" />7</>,
    drei: <><CheckCircle2 className="h-3.5 w-3.5" />Ihr seid zu dritt <Users className="h-3 w-3" />8</>,
    allein: <><User className="h-3.5 w-3.5" />Anfrage gesendet: Ich arbeite allein</>,
  }[wahl];
  return (
    <div className="w-52 space-y-2 text-xs">
      <p className="font-semibold">Such dir einen Partner.</p>
      <div className="rounded-lg border border-[#D6DCE5] bg-white px-2 py-1 text-[#9AA3B2]">Mit wem arbeitest du? Lea …{wahl === 'drei' && ' + Tim …'}</div>
      <div className="flex flex-wrap gap-1">
        <button onClick={() => setWahl(wahl === 'drei' ? 'paar' : 'drei')} className={zusatz}><UsersRound className="h-3 w-3" />Wir sind zu dritt</button>
        <button onClick={() => setWahl(wahl === 'allein' ? 'paar' : 'allein')} className={zusatz}><User className="h-3 w-3" />Ich arbeite allein</button>
      </div>
      <div className={`flex items-center gap-1 rounded-lg px-2 py-1 ${wahl === 'allein' ? 'bg-[#FBF3D5] text-[#6B4423]' : 'bg-[#DCEBE1] text-[#24553A]'}`}>{ergebnis}</div>
    </div>
  );
}