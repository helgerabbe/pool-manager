import React from 'react';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Ein großes Eingabefeld; die Leitfragen stehen am Rand. */
export default function BauplanRohEingabe({ felder, value, onChange }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
      <FreitextMitSprache rows={18} value={value} onChange={onChange}
        placeholder="Beschreibe die Aktivität frei – alles, was du zu den Fragen rechts weißt." />
      <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bitte beantworten</p>
        <ul className="space-y-2 text-sm">
          {felder.map(([k, titel, hilfe]) => (
            <li key={k}><span className="font-medium">{titel}</span><br /><span className="text-xs text-muted-foreground">{hilfe}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}