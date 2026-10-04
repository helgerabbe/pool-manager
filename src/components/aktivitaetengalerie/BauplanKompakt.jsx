import React from 'react';

/** Kompakte, gespeicherte Darstellung des Bauplans (nur lesen). */
export default function BauplanKompakt({ werte, felder }) {
  const gefuellt = felder.filter(([k]) => (werte[k] || '').trim());
  if (!gefuellt.length) return null;
  return (
    <div className="divide-y rounded-xl border bg-card">
      {gefuellt.map(([k, titel]) => (
        <div key={k} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr] sm:gap-4">
          <p className="text-sm font-semibold">{titel}</p>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{werte[k]}</p>
        </div>
      ))}
    </div>
  );
}