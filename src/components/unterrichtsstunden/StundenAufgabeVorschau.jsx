/**
 * Vorschau der KI-generierten Aufgabeninhalte einer Stunden-Phase:
 * zeigt jedes befüllte Feld mit seinem Label aus dem Aktivitäten-Katalog.
 */
import React from 'react';

function darstellung(wert) {
  if (wert === null || wert === undefined || wert === '') return null;
  if (typeof wert === 'string' || typeof wert === 'number') return String(wert);
  return JSON.stringify(wert, null, 2);
}

export default function StundenAufgabeVorschau({ fieldValues = {}, katalogEntry }) {
  const schema = Array.isArray(katalogEntry?.form_schema) ? katalogEntry.form_schema : [];
  const labelFuer = (name) => schema.find((f) => f?.field_name === name)?.label || name;
  const eintraege = Object.entries(fieldValues)
    .map(([k, v]) => [k, darstellung(v)])
    .filter(([, v]) => v);

  if (eintraege.length === 0) {
    return <p className="text-xs text-muted-foreground">Die KI hat keine Inhalte geliefert.</p>;
  }

  return (
    <div className="rounded-lg border border-border bg-white p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vorschau</p>
      {eintraege.map(([name, wert]) => (
        <div key={name} className="space-y-1">
          <p className="text-xs font-semibold text-foreground">{labelFuer(name)}</p>
          <pre className="text-xs whitespace-pre-wrap font-inter text-foreground/90 leading-relaxed">{wert}</pre>
        </div>
      ))}
    </div>
  );
}