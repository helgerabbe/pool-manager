import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

const ORTE = ['Klassenraum', 'Gruppenraum', 'Flur vorne', 'Flur hinten', 'Mensa', 'Kabine', 'Hof', 'Sonstiges'];
const BELEGUNG = { Gruppenraum: ['Gruppe A', 'Gruppe C'], Mensa: ['Partner 3', 'Partner 7'], 'Flur hinten': ['Lena'] };

/** Standardfolie „Lernort frei wählen“: Schüler gibt Ort an, Lehrkraft sieht die Übersicht. */
export default function LernortBild({ ansicht }) {
  const [ort, setOrt] = useState('');
  const [frei, setFrei] = useState(true);
  if (ansicht === 'schueler') return (
    <div className="w-full space-y-1.5 text-center text-[10px]">
      <MapPin className="mx-auto h-5 w-5 text-[#4A4170]" />
      <p className="font-semibold">Du darfst dir einen Lernort suchen. Wo arbeitest du?</p>
      <div className="grid grid-cols-4 gap-1">
        {ORTE.map((o) => <button key={o} onClick={() => setOrt(o)} className={`rounded-lg border px-1 py-1 ${ort === o ? 'border-[#3E5C8A] bg-[#E3EEF9]' : 'bg-white'}`}>{o}</button>)}
      </div>
      {ort && <p className="text-[#24553A]">Gemeldet: {ort}</p>}
    </div>
  );
  return (
    <div className="w-full space-y-1 text-[10px]">
      <button onClick={() => setFrei(!frei)} className={`rounded-full border px-2 py-0.5 font-semibold ${frei ? 'bg-[#DCEBE1] text-[#24553A]' : 'bg-white'}`}>Lernort frei: {frei ? 'an' : 'aus'}</button>
      {frei ? (
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(BELEGUNG).map(([o, n]) => <div key={o} className="rounded-lg border bg-white p-1"><b className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{o}</b>{n.join(', ')}</div>)}
          <div className="rounded-lg bg-[#EEF0F3] p-1 text-[#9AA3B2]">Noch keine Angabe: Tom, Ali</div>
        </div>
      ) : <p>Alle bitte zurück in den Klassenraum.</p>}
    </div>
  );
}