import React, { useState } from 'react';
import { ArrowRight, Eye, X } from 'lucide-react';

const FARBEN = ['bg-[#FFF4C2]', 'bg-[#DCEBFA]', 'bg-[#E3F4E1]', 'bg-[#FBE3CF]'];
const START = [
  { t: 'Ein Junge reist allein', n: 'Mia', g: '' }, { t: 'Es geht um Freundschaft', n: 'Ben', g: '' },
  { t: 'Spielt am Meer', n: 'Lea', g: '' }, { t: 'Jemand hat Angst', n: 'Tom', g: '' },
];

/** Interaktive Aufgabenfolie Digitale Kartenabfrage: Karten schreiben (Tablet), live Pinnwand und Clustern (Tafel). */
export default function KartenabfrageBild({ ansicht }) {
  const [karten, setKarten] = useState(START);
  const [meine, setMeine] = useState([]);
  const [text, setText] = useState('');
  const [modus, setModus] = useState('pinnwand');
  const [gruppe, setGruppe] = useState('');
  const [sichtbar, setSichtbar] = useState([]);

  if (ansicht === 'schueler') {
    const naechste = () => { setMeine([...meine, text.trim()]); setKarten([...karten, { t: text.trim(), n: 'Du', g: '' }]); setText(''); };
    return (
      <div className="w-full space-y-1 text-[9px]">
        <p className="font-bold">Schreib einen Gedanken auf eine Karte.</p>
        <div className="flex flex-wrap gap-1">{meine.map((m, i) => <span key={i} className={`rounded px-1.5 py-1 shadow-sm ${FARBEN[i % 4]}`}>{m}</span>)}</div>
        {meine.length < 3 ? (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={60} placeholder={`Karte ${meine.length + 1}: ein Gedanke …`} className="h-12 w-full rounded-lg border bg-[#FFF4C2] p-1" />
            <div className="flex items-center justify-between">
              <span className="text-[#6A7181]">{meine.length} von 3 Karten</span>
              <button disabled={!text.trim()} onClick={naechste} className="inline-flex items-center gap-1 rounded bg-[#3E5C8A] px-2 py-0.5 text-white disabled:opacity-40">Nächste Karte <ArrowRight className="h-3 w-3" /></button>
            </div>
          </>
        ) : <p className="font-semibold text-[#2E7D4F]">Fertig! Deine Karten hängen an der Tafel.</p>}
      </div>
    );
  }

  const gruppen = [...new Set(karten.map((k) => k.g).filter(Boolean))];
  const zuordnen = (i) => gruppe && setKarten(karten.map((k, j) => (j === i ? { ...k, g: k.g === gruppe ? '' : gruppe } : k)));
  const loeschen = (i) => setKarten(karten.filter((_, j) => j !== i));
  const kachel = (k, i) => (
    <span className={`group relative block rounded px-1.5 py-1 pr-6 shadow-sm ${FARBEN[i % 4]}`}>
      {k.t}
      {sichtbar.includes(i) && <span className="block text-[7px] text-[#6A7181]">{k.n}</span>}
      <span className="absolute right-0.5 top-0.5 flex gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Eye title="Wer hat das geschrieben?" onClick={() => setSichtbar(sichtbar.includes(i) ? sichtbar.filter((x) => x !== i) : [...sichtbar, i])} className="h-2.5 w-2.5 cursor-pointer text-[#6A7181]" />
        <X title="Karte von der Tafel nehmen" onClick={() => loeschen(i)} className="h-2.5 w-2.5 cursor-pointer text-[#C0392B]" />
      </span>
    </span>
  );
  return (
    <div className="w-full text-[9px]">
      <div className="mb-1 flex items-center gap-1">
        <b className="mr-auto">{karten.length} Karten eingegangen · live</b>
        {['pinnwand', 'clustern'].map((m) => <button key={m} onClick={() => setModus(m)} className={`rounded px-1.5 ${modus === m ? 'bg-[#3E5C8A] text-white' : 'border bg-white'}`}>{m === 'pinnwand' ? 'Pinnwand' : 'Clustern'}</button>)}
      </div>
      {modus === 'pinnwand' ? (
        <div className="flex flex-wrap gap-1">{karten.map((k, i) => <span key={i}>{kachel(k, i)}</span>)}</div>
      ) : (
        <>
          <input value={gruppe} onChange={(e) => setGruppe(e.target.value)} placeholder="Oberbegriff, dann Karten antippen" className="mb-1 w-full rounded border px-1 py-0.5" />
          <div className="grid grid-cols-3 gap-1">
            {[...gruppen, ''].map((g) => (
              <div key={g || 'offen'} className="space-y-0.5 rounded-lg border bg-white p-1">
                <p className="font-bold">{g || 'Noch ohne Gruppe'}</p>
                {karten.map((k, i) => k.g === g && <button key={i} onClick={() => zuordnen(i)} className="block w-full text-left">{kachel(k, i)}</button>)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}