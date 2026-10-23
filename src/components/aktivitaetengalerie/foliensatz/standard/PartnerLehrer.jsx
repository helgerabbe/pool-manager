import React, { useState } from 'react';
import { Users, User, X, Check } from 'lucide-react';

const START = [
  { id: 1, art: 'paar', namen: 'Lea · Tim' },
  { id: 2, art: 'paar', namen: 'Ali · Mia' },
  { id: 3, art: 'drei', namen: 'Ben · Noah · Ida' },
  { id: 4, art: 'allein', namen: 'Jonas' },
];
const klein = 'ml-auto rounded-full p-0.5 hover:bg-[#EEF0F3]';

/** Partner finden – Lehreransicht: Paare, Dreier, Allein-Wünsche; Lehrkraft kann auflösen oder ablehnen. */
export default function PartnerLehrer() {
  const [liste, setListe] = useState(START);
  const [ohne, setOhne] = useState(['Ella']);
  const aufloesen = (e) => { setListe(liste.filter((x) => x.id !== e.id)); setOhne([...ohne, ...e.namen.split(' · ')]); };
  const erlauben = (e) => setListe(liste.map((x) => (x.id === e.id ? { ...x, art: 'allein_ok' } : x)));
  return (
    <div className="grid w-full grid-cols-2 gap-1.5 text-[10px]">
      {liste.map((e) => (
        <div key={e.id} className={`rounded-lg border p-1.5 ${e.art === 'allein' ? 'border-[#EBD9A0] bg-[#FBF3D5]' : 'bg-white'}`}>
          <b className="flex items-center gap-0.5">
            {e.art.startsWith('allein') ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {e.art === 'allein' ? 'möchte allein' : e.art === 'allein_ok' ? 'allein (erlaubt)' : e.id}
            {e.art === 'allein' && <button onClick={() => erlauben(e)} title="Erlauben" className={klein}><Check className="h-3 w-3" /></button>}
            <button onClick={() => aufloesen(e)} title={e.art.startsWith('allein') ? 'Muss mit Partner arbeiten' : 'Auflösen'} className={e.art === 'allein' ? 'rounded-full p-0.5 hover:bg-[#EEF0F3]' : klein}><X className="h-3 w-3" /></button>
          </b>
          {e.namen}
        </div>
      ))}
      <div className="col-span-2 rounded-lg bg-[#EEF0F3] p-1 text-[#6A7181]">Ohne Partner: {ohne.join(', ')}</div>
    </div>
  );
}