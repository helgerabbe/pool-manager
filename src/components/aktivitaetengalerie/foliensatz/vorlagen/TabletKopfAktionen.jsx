import React from 'react';
import { FileText, X, Hand } from 'lucide-react';
import { CI_BOXEN } from '@/lib/folienCI';

const auf = CI_BOXEN.aufgabe;
const knopf = 'flex h-9 items-center gap-1.5 rounded-full px-3 text-base font-semibold';

/** Tablet-Kopfleiste: Aufgabenstellung als schwebendes Fenster aufklappen, Meldehand. */
export default function TabletKopfAktionen({ folie }) {
  const [offen, setOffen] = React.useState(false);
  const [meldet, setMeldet] = React.useState(false);
  return (
    <>
      {folie.inhalt && (
        <button onClick={() => setOffen(!offen)} className={knopf} style={{ background: auf.hg, color: auf.text, border: `2px solid ${auf.rand}` }}>
          <FileText className="h-5 w-5" /> Aufgabe
        </button>
      )}
      <button onClick={() => setMeldet(!meldet)} title="Ich habe eine Frage / brauche Hilfe" className={knopf} style={{ background: meldet ? '#F4B183' : '#FBE3CF', color: '#8A4B1E' }}>
        <Hand className="h-5 w-5" />{meldet ? 'Gemeldet' : 'Hilfe'}
      </button>
      {offen && (
        <div className="absolute right-0 top-12 z-20 w-[720px] rounded-xl border-2 px-5 py-4 shadow-2xl" style={{ background: auf.hg, borderColor: auf.rand, borderLeft: `6px solid ${auf.akzent}`, color: auf.text }}>
          <button onClick={() => setOffen(false)} className="absolute right-3 top-3 rounded-full p-1 hover:bg-black/5"><X className="h-5 w-5" /></button>
          {folie.methodisch && <p className="text-sm text-[#6A7181]">{folie.methodisch}</p>}
          <div className="mt-1 pr-8 text-[22px] font-semibold leading-snug">
            {folie.inhalt.split(/(?<=\?)\s+/).map((z, i) => <p key={i}>{z}</p>)}
          </div>
        </div>
      )}
    </>
  );
}