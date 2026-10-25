import React, { useState } from 'react';
import { Send } from 'lucide-react';

const FARBEN = ['bg-[#FFF4C2]', 'bg-[#DCEBFA]', 'bg-[#E3F4E1]', 'bg-[#FBE3CF]'];
const START = [
  { t: 'Ein Junge reist allein', g: 'Reise' }, { t: 'Es geht um Freundschaft', g: 'Gefühle' },
  { t: 'Spielt am Meer', g: 'Reise' }, { t: 'Jemand hat Angst', g: 'Gefühle' }, { t: 'Ein Geheimnis', g: '' },
];

/** Standardfolie Digitale Kartenabfrage: Schreiben (Tablet), Pinnwand und Clustern (Tafel). */
export default function KartenabfrageBild({ ansicht }) {
  const [karten, setKarten] = useState(START);
  const [text, setText] = useState('');
  const [modus, setModus] = useState('pinnwand');
  const [gruppe, setGruppe] = useState('');
  const eigene = karten.length - START.length;

  if (ansicht === 'schueler') return (
    <div className="w-full space-y-1 text-[9px]">
      <p className="font-bold">Schreib einen Gedanken auf eine Karte.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={60} placeholder="Ein Gedanke pro Karte …" className="h-12 w-full rounded-lg border bg-[#FFF4C2] p-1" />
      <div className="flex items-center justify-between">
        <span className="text-[#6A7181]">{eigene} von 3 Karten</span>
        <button disabled={!text.trim() || eigene >= 3} onClick={() => { setKarten([...karten, { t: text.trim(), g: '' }]); setText(''); }} className="inline-flex items-center gap-1 rounded bg-[#3E5C8A] px-2 py-0.5 text-white disabled:opacity-40"><Send className="h-3 w-3" /> Karte abschicken</button>
      </div>
    </div>
  );

  const gruppen = [...new Set(karten.map((k) => k.g).filter(Boolean))];
  const zuordnen = (i) => gruppe && setKarten(karten.map((k, j) => (j === i ? { ...k, g: k.g === gruppe ? '' : gruppe } : k)));
  return (
    <div className="w-full text-[9px]">
      <div className="mb-1 flex items-center gap-1">
        <b className="mr-auto">{karten.length} Karten eingegangen</b>
        {['pinnwand', 'clustern'].map((m) => <button key={m} onClick={() => setModus(m)} className={`rounded px-1.5 ${modus === m ? 'bg-[#3E5C8A] text-white' : 'border bg-white'}`}>{m === 'pinnwand' ? 'Pinnwand' : 'Clustern'}</button>)}
      </div>
      {modus === 'pinnwand' ? (
        <div className="flex flex-wrap gap-1">{karten.map((k, i) => <span key={i} className={`rounded px-1.5 py-1 shadow-sm ${FARBEN[i % 4]}`}>{k.t}</span>)}</div>
      ) : (
        <>
          <div className="mb-1 flex gap-1">
            <input value={gruppe} onChange={(e) => setGruppe(e.target.value)} placeholder="Oberbegriff, dann Karten antippen" className="flex-1 rounded border px-1 py-0.5" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[...gruppen, ''].map((g) => (
              <div key={g || 'offen'} className="rounded-lg border bg-white p-1">
                <p className="mb-0.5 font-bold">{g || 'Noch ohne Gruppe'}</p>
                {karten.map((k, i) => k.g === g && <button key={i} onClick={() => zuordnen(i)} className={`mb-0.5 block w-full rounded px-1 text-left ${FARBEN[i % 4]}`}>{k.t}</button>)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}