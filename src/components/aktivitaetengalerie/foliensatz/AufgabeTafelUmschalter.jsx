import React from 'react';
import { LayoutDashboard, FileText } from 'lucide-react';
import { CI_GRUND } from '@/lib/folienCI';
import FolieAnzeige from './FolieAnzeige';
import TafelVorschau from './tafel/TafelVorschau';
import ArbeitsphaseTafel from './tafel/ArbeitsphaseTafel';

const knopf = 'absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold shadow ring-1 ring-border hover:bg-white';

/** Tafel einer Tablet-Arbeitsform: Standard-Aufgabenerklärung, per Knopf umschaltbar zur interaktiven Tafel. */
export default function AufgabeTafelUmschalter({ s }) {
  const [interaktiv, setInteraktiv] = React.useState(false);
  return (
    <div className="relative">
      {interaktiv ? (
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
          <TafelVorschau><ArbeitsphaseTafel sozialform={s.folie.sozialform || 'EA'} /></TafelVorschau>
        </div>
      ) : <FolieAnzeige folie={{ id: s.key, ...s.folie }} ansicht="lehrer" />}
      <button type="button" className={knopf} onClick={() => setInteraktiv((v) => !v)}>
        {interaktiv ? <><FileText className="h-3 w-3" />Zurück zur Aufgabe</> : <><LayoutDashboard className="h-3 w-3" />Zur interaktiven Tafel</>}
      </button>
    </div>
  );
}