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
          <div className="pointer-events-none absolute -right-[12.5%] -top-[27.8%] aspect-square w-[47%] rounded-full" style={{ background: CI_FOLIENTYPEN[s.folientyp]?.farbe }} />
          <div className="relative flex w-full justify-center"><CiStandardBild art={s.key} ansicht={ansicht} /></div>
        </div>
      ) : ansicht === 'lehrer' && s.tablet_format ? (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl p-4 text-center text-xs ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
          <b>An der Tafel steht eins von beiden:</b>
          <div className="flex gap-2">
            <span className="rounded-lg border bg-white px-3 py-2">die Aufgabe<br /><span className="text-muted-foreground">(Aufgabenerklärung)</span></span>
            <span className="rounded-lg border bg-white px-3 py-2">die interaktive Tafel<br /><span className="text-muted-foreground">(Einzel-, Partner-, Gruppenphase)</span></span>
          </div>
        </div>
      ) : <FolieAnzeige folie={{ id: s.key, ...s.folie }} ansicht={ansicht} />}
      <p className="text-xs text-muted-foreground">{ansicht === 'schueler' ? s.schueler : s.lehrer}</p>
    </div>
  );
}