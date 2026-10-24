import React from 'react';

const Block = ({ titel, punkte = [] }) => (
  <div><p className="text-xs font-semibold uppercase text-muted-foreground">{titel}</p><ul className="list-disc pl-4 text-sm">{punkte.map((p) => <li key={p}>{p}</li>)}</ul></div>
);

/** Die festen Regeln einer Standardfolie: Gestaltung, Inhalt, Titel, was geklärt werden muss. */
export default function StandardFolienRegeln({ s }) {
  return (
    <div className="grid gap-3 rounded-lg bg-muted/50 p-3 md:grid-cols-2 xl:grid-cols-4">
      <Block titel="Gestaltung" punkte={s.gestaltung} />
      <Block titel="Inhalt" punkte={s.inhalt} />
      <Block titel="Titel im Stil von" punkte={(s.titel || []).map((t) => `„${t}“`)} />
      <Block titel="Muss geklärt werden" punkte={s.klaeren} />
    </div>
  );
}