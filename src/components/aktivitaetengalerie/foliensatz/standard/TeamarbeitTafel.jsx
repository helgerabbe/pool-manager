import React from 'react';
import { Users, Network, Volume1, PlusCircle, Hand, Check } from 'lucide-react';
import { CI_SYMBOL_STIL, CI_TIMER, CI_GRUPPEN } from '@/lib/folienCI';

const kreis = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };
const PAARE = [['1', 100], ['2', 40, true], ['3', 80], ['4', 100], ['5', 20], ['6', 60]];

/** Tafel während Partner- (art="partner") oder Gruppenarbeit (art="gruppe"), im Aufbau wie „Einzelarbeit läuft“.
 *  Optional: Timer, Fortschrittsbalken je Team, Zusatzaufgabe. */
export default function TeamarbeitTafel({ art }) {
  const gruppe = art === 'gruppe';
  const teams = gruppe ? CI_GRUPPEN.slice(0, 4).map((g, i) => ({ n: g.kennung, p: [100, 60, 30, 80][i], g })) : PAARE.map(([n, p, m]) => ({ n, p, m }));
  const fertig = teams.filter((t) => t.p === 100).length;
  return (
    <div className="flex w-full flex-col gap-2 text-xs">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <div className="flex gap-1.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={kreis}>{gruppe ? <Network className="h-5 w-5" /> : <Users className="h-5 w-5" />}</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={kreis}><Volume1 className="h-5 w-5" /></span>
          </div>
          <p className="font-semibold">{gruppe ? 'Ihr arbeitet in eurer Gruppe. Bitte leise sprechen.' : 'Ihr arbeitet zu zweit. Bitte flüstern.'}</p>
          <p className="text-[10px] text-[#6A7181]">Aufgabe: Gründe für den Umzug in die Stadt sammeln</p>
          <p className="flex items-center gap-1 text-[10px] text-[#4A4170]"><PlusCircle className="h-3 w-3" />Fertig? Dann die Zusatzaufgabe.</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 text-sm font-bold" style={{ background: CI_TIMER.normal.hg, color: CI_TIMER.normal.text, borderColor: CI_TIMER.normal.ring }}>8:00</span>
          <span className="text-[10px]">{fertig} von {teams.length} {gruppe ? 'Gruppen' : 'Paaren'} fertig</span>
        </div>
      </div>
      <div className={`grid gap-1 ${gruppe ? 'grid-cols-4' : 'grid-cols-6'}`}>
        {teams.map((t) => (
          <div key={t.n} className="rounded-md border bg-white p-1 text-[9px]" style={t.g ? { background: t.g.hg, color: t.g.text, borderColor: t.g.hg } : undefined}>
            <b className="flex items-center gap-0.5">{gruppe ? <Network className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}{t.n}
              {t.m && <Hand className="ml-auto h-2.5 w-2.5 text-[#8A4B3C]" />}{t.p === 100 && <Check className="ml-auto h-2.5 w-2.5 text-[#24553A]" />}</b>
            <div className="mt-1 h-1 rounded bg-[#E4E1DA]"><div className="h-1 rounded bg-[#7FA6D6]" style={{ width: `${t.p}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}