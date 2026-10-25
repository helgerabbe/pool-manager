import React from 'react';
import { CI_GRUND, CI_FOLIENTYPEN } from '@/lib/folienCI';
import CiStandardBild from './CiStandardBild';
import FolieAnzeige from './FolieAnzeige';
import AufgabeTafelUmschalter from './AufgabeTafelUmschalter';

/** Eine Ansicht (Tablet oder Tafel) einer Standardfolie mit kurzer Beschreibung darunter. */
export default function StandardFolieAnsicht({ s, ansicht }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{ansicht === 'schueler' ? 'Schüler (Tablet)' : 'Lehrkraft (Tafel)'}</p>
      {s.ci ? (
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
          <div className="pointer-events-none absolute -right-[12.5%] -top-[27.8%] aspect-square w-[47%] rounded-full" style={{ background: CI_FOLIENTYPEN[s.folientyp]?.farbe }} />
          {s.symbol && <img src={s.symbol} alt="" className="absolute right-[3%] top-[4%] h-[22%] object-contain mix-blend-multiply" />}
          <div className="relative flex w-full justify-center"><CiStandardBild art={s.key} ansicht={ansicht} /></div>
        </div>
      ) : ansicht === 'lehrer' && s.tablet_format ? <AufgabeTafelUmschalter s={s} /> : <FolieAnzeige folie={{ id: s.key, ...s.folie }} ansicht={ansicht} />}
      <p className="text-xs text-muted-foreground">{ansicht === 'schueler' ? s.schueler : s.lehrer}</p>
    </div>
  );
}