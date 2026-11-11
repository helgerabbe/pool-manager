import React from 'react';
import { Flag, Compass } from 'lucide-react';
import LernpaketAufgabenBereich from './LernpaketAufgabenBereich';
import AufgabenEinstellungenHilfe from './AufgabenEinstellungenHilfe';

const SYMBOL = { einstieg: Compass, gesamtaufgabe: Flag };

/** Ein fester Platz im Themenfeld („Einstieg" oder „Gesamtaufgabe") mit seinen Aufgaben. */
export default function ThemenfeldPlatzKarte({ platz, themenfeld, editierbar }) {
  const Symbol = SYMBOL[platz.key];
  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Symbol className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
            {platz.titel}
            <AufgabenEinstellungenHilfe imLernpaket={false} />
          </p>
          <p className="text-xs text-muted-foreground">{platz.beschreibung}</p>
        </div>
      </div>
      <LernpaketAufgabenBereich
        paket={{ einheit_id: themenfeld.einheit_id, themenfeld_id: themenfeld.id }}
        platz={platz}
        editierbar={editierbar}
      />
    </div>
  );
}