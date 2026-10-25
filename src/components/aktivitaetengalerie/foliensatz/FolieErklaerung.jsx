import React from 'react';
import { Layers, PenLine, PlusCircle } from 'lucide-react';
import { CI_REGELN } from '@/lib/standardFolienRegeln';

const Liste = ({ titel, icon: Icon, punkte }) => punkte?.length ? (
  <div>
    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Icon className="h-3.5 w-3.5" />{titel}</p>
    <ul className="list-disc space-y-1 pl-4 text-sm">{punkte.map((p) => <li key={p}>{p}</li>)}</ul>
  </div>
) : null;

const alsListe = (x) => (Array.isArray(x) ? x : x ? [x] : []);
// Ja/Nein-Fragen („Soll …?“, „Gibt es …?“) sind zuschaltbare Zusätze, alles andere muss befüllt werden.
const istOptional = (f) => /^(soll|sollen|gibt es|wird|werden|ist .* zuschaltbar)/i.test(f.trim());

/** Rechte Spalte: was auf der Folie liegt, welche variablen Elemente befüllt werden, welche Inhalte optional sind. */
export default function FolieErklaerung({ folie }) {
  // Standardfolien: Fragen aus dem festen Regelwerk statt aus dem Bauvorschlag (keine Dopplungen, nichts Fremdes).
  const fragen = [...new Set(CI_REGELN[folie.standard]?.klaeren || alsListe(folie.entscheidungen || folie.abfrage))];
  const pflicht = fragen.filter((f) => !istOptional(f));
  const optional = fragen.filter(istOptional);
  return (
    <aside className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-xl border bg-muted/30 p-3">
      {folie.erklaerung && <p className="text-sm italic text-muted-foreground">{folie.erklaerung}</p>}
      <Liste titel="Was auf der Folie liegt" icon={Layers} punkte={alsListe(folie.liegt)} />
      <Liste titel="Variable Elemente – müssen befüllt werden" icon={PenLine} punkte={pflicht} />
      <Liste titel="Optionale Inhalte – können dazugenommen werden" icon={PlusCircle} punkte={optional} />
      {!fragen.length && <p className="text-xs text-muted-foreground">Diese Folie hat keine variablen Elemente.</p>}
    </aside>
  );
}