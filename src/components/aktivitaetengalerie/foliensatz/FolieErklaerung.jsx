import React from 'react';
import { Layers, ListChecks } from 'lucide-react';

const Liste = ({ titel, icon: Icon, punkte }) => punkte?.length ? (
  <div>
    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Icon className="h-3.5 w-3.5" />{titel}</p>
    <ul className="list-disc space-y-1 pl-4 text-sm">{punkte.map((p) => <li key={p}>{p}</li>)}</ul>
  </div>
) : null;

const alsListe = (x) => (Array.isArray(x) ? x : x ? [x] : []);

/** Rechte Spalte: was auf der Folie liegt, was die Lehrkraft vorher entscheidet, plus alle Entscheidungen der Methode. */
export default function FolieErklaerung({ folie, folien = [] }) {
  const alle = [...new Set(folien.flatMap((f) => alsListe(f.entscheidungen || f.abfrage)))];
  return (
    <aside className="w-72 shrink-0 space-y-4 overflow-y-auto rounded-xl border bg-muted/30 p-3">
      {folie.erklaerung && <p className="text-sm italic text-muted-foreground">{folie.erklaerung}</p>}
      <Liste titel="Was auf der Folie liegt" icon={Layers} punkte={alsListe(folie.liegt)} />
      <Liste titel="Lehrkraft entscheidet vorher" icon={ListChecks} punkte={alsListe(folie.entscheidungen || folie.abfrage)} />
      {!alsListe(folie.entscheidungen || folie.abfrage).length && <p className="text-xs text-muted-foreground">Auf dieser Folie muss die Lehrkraft nichts entscheiden.</p>}
      {alle.length > 0 && (
        <div className="border-t pt-3">
          <Liste titel={`Alle Fragen an die Lehrkraft (${alle.length}) – Grundlage für den Unterrichtsassistenten`} icon={ListChecks} punkte={alle} />
        </div>
      )}
    </aside>
  );
}