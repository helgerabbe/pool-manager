import React from 'react';
import { CI_GRUND, CI_FOLIENTYPEN } from '@/lib/folienCI';
import CiStandardBild from './CiStandardBild';
import FolieAnzeige from './FolieAnzeige';

/** Eine Ansicht (Tablet oder Tafel) einer Standardfolie mit kurzer Beschreibung darunter. */
export default function StandardFolieAnsicht({ s, ansicht }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{ansicht === 'schueler' ? 'Schüler (Tablet)' : 'Lehrkraft (Tafel)'}</p>
      {s.ci ? (
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full" style={{ background: CI_FOLIENTYPEN[s.folientyp]?.farbe }} />
          <div className="relative flex w-full justify-center"><CiStandardBild art={s.key} ansicht={ansicht} /></div>
        </div>
      ) : <FolieAnzeige folie={{ id: s.key, ...s.folie }} ansicht={ansicht} />}
      <p className="text-xs text-muted-foreground">{ansicht === 'schueler' ? s.schueler : s.lehrer}</p>
    </div>
  );
}