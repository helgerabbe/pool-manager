import React from 'react';
import { PenLine, Hand, Users } from 'lucide-react';
import { CI_BOXEN } from '@/lib/folienCI';
import VorlagenInhalt from './VorlagenInhalt';
import TippHilfe from './TippHilfe';

const auf = CI_BOXEN.aufgabe;
const AufgabeOben = ({ f }) => (
  <div className="rounded-xl border-2 px-5 py-3" style={{ background: auf.hg, borderColor: auf.rand, borderLeft: `6px solid ${auf.akzent}`, color: auf.text }}>
    <p className="text-sm text-[#6A7181]">{f.methodisch}</p>
    <div className="mt-1 text-[22px] font-semibold leading-snug">
      {(f.inhalt || '').split(/(?<=\?)\s+/).map((z, i) => <p key={i}>{z}</p>)}
    </div>
  </div>
);

/** Tablet-Ansicht (Schülergerät): Aufgabe kompakt oben, Arbeitsfläche darunter, kein Scrollen. */
export default function TabletInhalt({ f }) {
  if (f.vorlage === 'phase' && f.phase === 'Share') return (
    <div className="flex flex-1 flex-col gap-4 pr-48">
      <AufgabeOben f={f} />
      <div className="flex flex-1 flex-col rounded-xl border-2 border-[#E4E1DA] bg-white p-5">
        <p className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#6A7181]"><Users className="h-5 w-5" /> Euer Ergebnis aus der Pair-Phase</p>
        <p className="flex-1 text-xl text-[#9AA1AE]">Hier steht, was ihr zu zweit festgehalten habt.</p>
      </div>
      <button className="flex items-center gap-2 self-start rounded-xl bg-[#FBE3CF] px-6 py-3 text-xl font-semibold text-[#8A4B1E]"><Hand className="h-6 w-6" /> Ich möchte etwas sagen</button>
    </div>
  );
  if (f.vorlage === 'phase' || f.vorlage === 'impuls') return (
    <div className="flex flex-1 flex-col gap-4 pr-16">
      <div className="relative h-1/4"><AufgabeOben f={f} />{f.tipps?.length > 0 && <TippHilfe tipps={f.tipps} />}</div>
      <div className="flex flex-1 flex-col rounded-xl border-2 border-[#C9CED8] bg-white p-5">
        <p className="mb-2 flex items-center gap-2 text-lg font-semibold text-[#6A7181]"><PenLine className="h-5 w-5" />{f.phase === 'Pair' ? 'Gemeinsames Notizfeld (Partner 7)' : 'Meine Ideen'}</p>
        <textarea className="flex-1 resize-none bg-transparent text-xl outline-none" placeholder={f.phase === 'Pair' ? 'Haltet hier eure Einigung fest …' : 'Schreibe hier deine Ideen auf …'} />
      </div>
    </div>
  );
  if (f.vorlage === 'sammlung') return (
    <div className="flex flex-1 flex-col gap-4 pr-48">
      <div><h2 className="text-[36px] font-bold leading-tight">{f.titel}</h2>{f.frage && <p className="text-xl text-[#3E5C8A]">{f.frage}</p>}</div>
      <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-[#C9CED8] bg-white text-xl text-[#9AA1AE]">Die Sammlung erscheint hier live, während deine Lehrkraft mitschreibt.</div>
    </div>
  );
  return <VorlagenInhalt f={f} />;
}