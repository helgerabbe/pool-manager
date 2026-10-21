import React from 'react';

const Block = ({ titel, text }) => text ? (
  <div><p className="text-xs font-semibold text-muted-foreground">{titel}</p><p className="whitespace-pre-wrap text-sm">{text}</p></div>
) : null;

/** Rechte Spalte: Erklärung, was fest ist und was die Lehrkraft vorher einträgt. */
export default function FolieErklaerung({ folie }) {
  return (
    <aside className="w-64 shrink-0 space-y-3 overflow-y-auto rounded-xl border bg-muted/30 p-3">
      <Block titel="Was auf der Folie liegt" text={folie.erklaerung || folie.beschreibung} />
      <Block titel="Fest vorgegeben" text={folie.fest} />
      <Block titel="Lehrkraft trägt vorher ein" text={folie.abfrage} />
    </aside>
  );
}