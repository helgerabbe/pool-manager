import React from 'react';
import { Mic, Square, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

const MAX = 60;
const VERSUCHE = 3;

/** Sprechaufgabe (Skizze): Aufnahme starten/stoppen, danach Beispiel-Rückmeldung der KI. */
export default function SprechaufgabeTabletInhalt() {
  const [zustand, setZustand] = React.useState('bereit');
  const [sek, setSek] = React.useState(0);
  const [versuch, setVersuch] = React.useState(0);
  React.useEffect(() => {
    if (zustand !== 'aufnahme') return;
    const t = setInterval(() => setSek((s) => { if (s + 1 >= MAX) { setZustand('fertig'); return MAX; } return s + 1; }), 1000);
    return () => clearInterval(t);
  }, [zustand]);
  const start = () => { setSek(0); setVersuch((v) => v + 1); setZustand('aufnahme'); };
  const zeit = `${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
  return (
    <div className="m-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-xl border-2 border-[#C9CED8] bg-white p-5">
      <p className="text-center text-xl font-semibold text-[#121721]">Nenne auf Englisch sechs Tiere, die auf einem Bauernhof leben. Sprich in ganzen Sätzen: „A cow lives on a farm.“</p>
      {zustand === 'aufnahme' ? (
        <button type="button" onClick={() => setZustand('fertig')} className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-white animate-pulse"><Square className="h-9 w-9" /></button>
      ) : zustand === 'bereit' ? (
        <button type="button" onClick={start} className="flex h-24 w-24 items-center justify-center rounded-full bg-[#2A4074] text-white"><Mic className="h-10 w-10" /></button>
      ) : null}
      <p className="text-base text-[#6A7181]">
        {zustand === 'bereit' && `Tippe aufs Mikrofon · höchstens ${MAX} Sekunden`}
        {zustand === 'aufnahme' && `Aufnahme läuft · ${zeit}`}
        {zustand === 'fertig' && `Versuch ${versuch} von ${VERSUCHE}`}
      </p>
      {zustand === 'fertig' && (
        <div className="w-full space-y-2 rounded-xl bg-[#F6F7F9] p-4 text-base">
          <p className="flex items-start gap-2 text-emerald-700"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> Du hast vier Tiere in ganzen Sätzen genannt: cow, pig, horse, sheep.</p>
          <p className="flex items-start gap-2 text-amber-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /> Es fehlen noch zwei Tiere. Versuch es noch einmal!</p>
          {versuch < VERSUCHE && <button type="button" onClick={() => setZustand('bereit')} className="flex items-center gap-1 pt-1 font-semibold text-[#2A4074]"><RotateCcw className="h-4 w-4" /> Neu aufnehmen</button>}
        </div>
      )}
    </div>
  );
}