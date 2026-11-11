import React from 'react';
import { cn } from '@/lib/utils';
import { getSchrittTyp, istSchrittVollstaendig, schrittBeschriftung, schrittZusammenfassung } from '@/lib/schrittTypen';

/** Ein Element einer Aufgabe in der Aufgaben-Übersicht: Art, Titel, Kurzinhalt und Zustand. */
export default function AufgabeElementKarte({ schritt, nummer, aktivitaetName = '' }) {
  const typ = getSchrittTyp(schritt.typ);
  const fertig = istSchrittVollstaendig(schritt);
  const inhalt = schrittZusammenfassung(schritt);
  return (
    <div className="flex items-start gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-card border border-rose-200 text-xs font-bold text-foreground shrink-0">
        {nummer}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border', typ?.classes?.badge || 'bg-muted text-muted-foreground border-border')}>
            {schrittBeschriftung(schritt, typ, aktivitaetName)}
          </span>
          <span className="text-sm font-semibold text-foreground">{schritt.titel?.trim() || `Element ${nummer}`}</span>
        </div>
        {inhalt && <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{inhalt}</p>}
      </div>
      <span className={cn('shrink-0 text-[11px]', fertig ? 'text-muted-foreground' : 'text-amber-700')}>
        {fertig ? 'Vollständig' : 'Noch unvollständig'}
      </span>
    </div>
  );
}