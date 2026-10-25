import React, { useState } from 'react';
import { CI_BOXEN } from '@/lib/folienCI';

const BILD = 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/eb6a96219_generated_image.png';
const ABLAUF = ['Wiederholung', 'Partnerarbeit: Gründe sammeln', 'Ergebnisse vergleichen'];
const ECKE = 'radial-gradient(ellipse at bottom right, black 45%, transparent 75%)';

/** Standardfolie „Stundenstart“: Tablet nur Fach, Einheit, Thema; Tafel zusätzlich Ziel und Ablauf (zuschaltbar). */
export default function StartBild({ ansicht }) {
  const [ziel, setZiel] = useState(true);
  const [ablauf, setAblauf] = useState(true);
  const m = CI_BOXEN.merksatz;
  const lehrer = ansicht === 'lehrer';
  const schalter = (an, set, l) => <button onClick={() => set(!an)} className={`rounded-full border px-1.5 text-[8px] leading-4 ${an ? 'bg-[#DCEBE1] text-[#24553A]' : 'bg-white text-[#6A7181]'}`}>{l}: {an ? 'an' : 'aus'}</button>;
  return (
    <div className="min-h-[170px] w-full space-y-1 text-[10px] [&>*]:relative [&>*]:z-10">
      {lehrer && <div className="flex gap-1">{schalter(ziel, setZiel, 'Stundenziel')}{schalter(ablauf, setAblauf, 'Ablauf')}</div>}
      <p className="text-[#6A7181]">Erdkunde · Einheit: Stadt und Land</p>
      <p className="text-base font-bold">Warum ziehen Menschen in die Stadt?</p>
      {lehrer && ziel && <div className="mr-24 rounded-lg border px-2 py-1" style={{ background: m.hg, borderColor: m.rand, color: m.text }}>Am Ende der Stunde kannst du drei Gründe für den Umzug in die Stadt erklären.</div>}
      {lehrer && ablauf && (
        <div className="relative z-10"><b>Heute:</b>
          <ol className="ml-4 list-decimal">{ABLAUF.map((a) => <li key={a}>{a}</li>)}</ol>
        </div>
      )}
      <img src={BILD} alt="Jemand packt einen Umzugskarton" className="!absolute !z-0 -bottom-[3%] -right-[3%] h-[55%] w-[42%] object-cover"
        style={{ WebkitMaskImage: ECKE, maskImage: ECKE }} />
    </div>
  );
}