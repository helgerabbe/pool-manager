import React, { useState } from 'react';
import { CI_BOXEN } from '@/lib/folienCI';

const BILD = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/eb6a96219_generated_image.png';
const ABLAUF = ['Wiederholung', 'Partnerarbeit: Gründe sammeln', 'Ergebnisse vergleichen'];

/** Standardfolie „Stundenstart“: Fach, Einheit, Thema; Ziel und Ablauf zuschaltbar. */
export default function StartBild({ ansicht }) {
  const [ziel, setZiel] = useState(true);
  const [ablauf, setAblauf] = useState(true);
  const m = CI_BOXEN.merksatz;
  const schalter = (an, set, l) => <button onClick={() => set(!an)} className={`rounded-full border px-2 py-0.5 ${an ? 'bg-[#DCEBE1] text-[#24553A]' : 'bg-white'}`}>{l}: {an ? 'an' : 'aus'}</button>;
  return (
    <div className="w-full space-y-1 text-[10px]">
      {ansicht === 'lehrer' && <div className="flex gap-1">{schalter(ziel, setZiel, 'Stundenziel')}{schalter(ablauf, setAblauf, 'Ablauf')}</div>}
      <p className="text-[#6A7181]">Erdkunde · Einheit: Stadt und Land</p>
      <p className="text-base font-bold">Warum ziehen Menschen in die Stadt?</p>
      {ziel && <div className="rounded-lg border px-2 py-1" style={{ background: m.hg, borderColor: m.rand, color: m.text }}>Am Ende der Stunde kannst du drei Gründe für den Umzug in die Stadt erklären.</div>}
      {ablauf && <p><b>Heute:</b> {ABLAUF.map((a, i) => `${i + 1} ${a}`).join(' · ')}</p>}
      <div className="relative mt-2 h-28 overflow-hidden rounded-lg">
        <img src={BILD} alt="Jemand packt einen Umzugskarton" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/70 to-transparent" />
      </div>
    </div>
  );
}