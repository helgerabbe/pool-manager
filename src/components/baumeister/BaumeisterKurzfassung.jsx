import React from 'react';

/** Kurz und konkret: was der Baumeister ändern würde – nur die betroffenen Textstellen. */
export default function BaumeisterKurzfassung({ aenderung, stellen }) {
  return (
    <div className="space-y-3 overflow-y-auto">
      <div className="text-sm rounded-md bg-accent/10 border border-accent/40 px-3 py-2">
        <span className="font-semibold">Das würde ich ändern: </span>{aenderung || 'Die folgenden Textstellen.'}
      </div>
      {stellen.map((s, i) => (
        <div key={i} className="rounded-lg border border-border overflow-hidden text-sm">
          <div className="px-3 py-2 bg-destructive/10">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Vorher</p>
            <p className="whitespace-pre-wrap line-through decoration-destructive/50">{s.vorher}</p>
          </div>
          <div className="px-3 py-2 bg-chart-3/10">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Nachher</p>
            <p className="whitespace-pre-wrap">{s.nachher}</p>
          </div>
        </div>
      ))}
    </div>
  );
}