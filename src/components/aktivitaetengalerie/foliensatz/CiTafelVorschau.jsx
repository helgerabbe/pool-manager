import React from 'react';
import { Volume1, Star } from 'lucide-react';
import { CI_GRUND } from '@/lib/folienCI';
import { CI_TAFEL_ELEMENTE } from '@/lib/folienCITafel';
import { startWerkzeuge } from '@/lib/tafelWerkzeuge';
import WerkzeugMenue from './tafel/WerkzeugMenue';
import AktionsLeiste from './tafel/AktionsLeiste';
import HilfeWarteschlange from './tafel/HilfeWarteschlange';
import Stimmungsbarometer from './tafel/Stimmungsbarometer';
import Laermampel from './standard/Laermampel';
import TeamKachel from './standard/TeamKachel';
import KarteVorlage from './standard/kartenabfrage/KarteVorlage';
import KartenStapel from './standard/kartenabfrage/KartenStapel';

/** Vorschau Teil 17: Elemente der Funktionstafel – dieselben Bausteine wie auf der Standardfolie. */
export default function CiTafelVorschau() {
  const [an, setAn] = React.useState(() => startWerkzeuge('PA'));
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
      <div className="flex flex-wrap items-center gap-3">
        <WerkzeugMenue sozialform="PA" an={an} setAn={setAn} />
        <AktionsLeiste sozialform="PA" onAktion={() => {}} />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3EEF9] text-[#2A4074]"><Volume1 className="h-4 w-4" /></span>
        <span className="flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-[10px]"><Star className="h-3 w-3 fill-[#C98A12] text-[#C98A12]" />0 / 10 Sterne</span>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <HilfeWarteschlange team />
        <Stimmungsbarometer />
        <Laermampel />
        <div className="flex flex-col items-center justify-center gap-1">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#7FA6D6] text-lg font-bold text-[#1E3A6E]">8:00</span>
          <span className="text-[10px] font-semibold">2 von 6 fertig</span>
        </div>
      </div>
      <div className="grid max-w-md grid-cols-3 gap-2">
        <TeamKachel t={{ n: 1, p: 100 }} rueckmeldung experte />
        <TeamKachel t={{ n: 2, p: 40, m: true }} rueckmeldung sterne={2} />
        <TeamKachel t={{ n: 3, p: 70 }} rueckmeldung />
      </div>
      <div className="flex items-end gap-6 text-[10px]">
        <KarteVorlage className="w-28 -rotate-1"><span className="font-hand text-sm">Es geht um Freundschaft</span><br /><br /></KarteVorlage>
        <KartenStapel anzahl={4} />
      </div>
      <ul className="list-disc space-y-0.5 pl-5 text-xs">{CI_TAFEL_ELEMENTE.map((e) => <li key={e.typ}><b>{e.name}:</b> {e.regel}</li>)}</ul>
    </div>
  );
}