import React, { useState } from 'react';
import { Check, Flag, Compass, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LernpaketAufgabenBereich from './LernpaketAufgabenBereich';
import AufgabenEinstellungenHilfe from './AufgabenEinstellungenHilfe';

const SYMBOL = { einstieg: Compass, gesamtaufgabe: Flag };

/**
 * Ein fester Platz im Themenfeld („Einstieg" oder „Gesamtaufgabe") mit seinen
 * Aufgaben. Geändert wird erst nach „Bearbeiten"; mit `onAufgabeOeffnen`
 * führt ein Klick auf eine Aufgabe zu ihrer Übersichtsseite.
 */
export default function ThemenfeldPlatzKarte({ platz, themenfeld, editierbar, onAufgabeOeffnen = null }) {
  const Symbol = SYMBOL[platz.key];
  const [bearbeitet, setBearbeitet] = useState(false);
  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Symbol className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
            {platz.titel}
            <AufgabenEinstellungenHilfe imLernpaket={false} />
          </p>
          <p className="text-xs text-muted-foreground">{platz.beschreibung}</p>
        </div>
        {editierbar && (bearbeitet ? (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setBearbeitet(false)}>
            <Check /> Fertig
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setBearbeitet(true)}
            className="gap-2 shrink-0 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900">
            <PenLine /> Bearbeiten
          </Button>
        ))}
      </div>
      <LernpaketAufgabenBereich
        paket={{ einheit_id: themenfeld.einheit_id, themenfeld_id: themenfeld.id }}
        platz={platz}
        editierbar={editierbar && bearbeitet}
        onUebersicht={onAufgabeOeffnen}
      />
    </div>
  );
}