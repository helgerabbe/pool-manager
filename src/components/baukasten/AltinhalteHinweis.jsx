import React from 'react';
import { Archive } from 'lucide-react';

/** Altinhalte, die bei der Überführung keinem Baustein zugeordnet werden konnten. */
export default function AltinhalteHinweis({ offen, onUebernehmen, onVerwerfen }) {
  if (!offen?.length) return null;
  return (
    <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold"><Archive className="h-4 w-4 text-accent" /> Aus dem alten Stundenbau ohne Zuordnung</p>
      {offen.map((o, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="flex-1">{o.titel} · {o.folien.length} Folien</span>
          <button onClick={() => onUebernehmen(i)} className="rounded-md border bg-card px-2 py-0.5 hover:border-primary">Als Baustein übernehmen</button>
          <button onClick={() => onVerwerfen(i)} className="text-muted-foreground hover:text-destructive">Verwerfen</button>
        </div>
      ))}
    </div>
  );
}