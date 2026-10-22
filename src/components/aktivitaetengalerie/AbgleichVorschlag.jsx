import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ART = { ergaenzt: ['+', 'text-green-700'], geaendert: ['~', 'text-amber-700'], entfernt: ['−', 'text-destructive'] };

/** Ein Änderungsvorschlag für ein Feld mit Übernehmen/Verwerfen. */
export default function AbgleichVorschlag({ titel, vorschlag, onUebernehmen, onVerwerfen }) {
  const liste = vorschlag.aenderungen || [];
  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <p className="text-sm font-semibold">{titel}</p>
      {vorschlag.passt || !liste.length ? <p className="text-sm text-green-700">Passt, keine Änderung nötig.</p> : (
        <>
          <ul className="space-y-1 text-sm">
            {liste.map((a, i) => <li key={i} className={ART[a.art]?.[1]}><b>{ART[a.art]?.[0]}</b> {a.text}</li>)}
          </ul>
          <p className="text-sm">Soll ich das so übernehmen?</p>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1" onClick={onUebernehmen}><Check className="h-4 w-4" /> Ja, übernehmen</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={onVerwerfen}><X className="h-4 w-4" /> Nein</Button>
          </div>
        </>
      )}
    </div>
  );
}