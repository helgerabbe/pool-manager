import React, { useState } from 'react';
import { CI_ERGEBNIS } from '@/lib/folienCI';

const AUSSAGEN = ['Ich habe das Thema verstanden', 'Ich habe alles geschafft', 'Ich habe mich wohlgefühlt', 'Das Thema war schwierig', 'Wir sollten das vertiefen'];
const LEHRKRAFT = ['Sie haben verständlich erklärt', 'Der Unterricht war spannend', 'Neu ausprobiert: Wie fandet ihr das?'];
const WAHL = ['stimmt', 'teils', 'stimmt nicht'];
const WERTE = [[70, 20, 10], [55, 30, 15], [80, 10, 10], [30, 40, 30], [45, 35, 20]];

/** Standardfolie Reflexion: Schüler bewertet Aussagen, Lehrkraft sieht anonyme Balken. */
export default function ReflexionBild({ ansicht }) {
  const [teil, setTeil] = useState('stunde');
  const [antw, setAntw] = useState({});
  const liste = teil === 'stunde' ? AUSSAGEN : LEHRKRAFT;
  const umschalter = (
    <div className="mb-1 flex gap-1">
      {[['stunde', 'Zur Stunde'], ['lehrkraft', 'An die Lehrkraft (freiwillig)']].map(([k, l]) => <button key={k} onClick={() => setTeil(k)} className={`rounded-full border px-2 py-0.5 ${teil === k ? 'bg-[#F5E1DC] font-semibold' : 'bg-white'}`}>{l}</button>)}
    </div>
  );
  if (ansicht === 'schueler') return (
    <div className="w-full text-[9px]">
      {umschalter}
      {liste.map((a) => (
        <div key={a} className="mb-0.5 flex items-center gap-1">
          <span className="flex-1">{a}</span>
          {WAHL.map((w) => <button key={w} onClick={() => setAntw({ ...antw, [a]: w })} className={`rounded border px-1 ${antw[a] === w ? 'border-[#3E5C8A] bg-[#E3EEF9]' : 'bg-white'}`}>{w}</button>)}
        </div>
      ))}
      {teil === 'lehrkraft' && <p className="text-right text-[#6A7181]">anonym · Überspringen</p>}
    </div>
  );
  return (
    <div className="w-full text-[9px]">
      {umschalter}
      {liste.map((a, i) => (
        <div key={a} className="mb-0.5 flex items-center gap-1">
          <span className="w-28 truncate">{a}</span>
          <div className="flex h-2 flex-1 overflow-hidden rounded">{WERTE[i].map((p, j) => <div key={j} style={{ width: `${p}%`, background: CI_ERGEBNIS.reihe[j] }} />)}</div>
        </div>
      ))}
      {teil === 'stunde'
        ? <p className="mt-1 rounded bg-[#FBF3D5] px-1">Nur Lehrergerät · Braucht Unterstützung: Tom, Mia</p>
        : <p className="mt-1 text-[#6A7181]">Anonym, nur auf dem Lehrergerät</p>}
    </div>
  );
}