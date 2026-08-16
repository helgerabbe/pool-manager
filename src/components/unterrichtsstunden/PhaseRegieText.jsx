/**
 * Regieanweisung einer Phase, leicht erfassbar dargestellt:
 * Der erste Satz (die Kernhandlung) steht fett, der Rest als Erläuterung.
 */
import React from 'react';

export default function PhaseRegieText({ text }) {
  if (!text) return null;
  const treffer = text.match(/^(.*?[.!?])(\s+)([\s\S]+)$/);
  const kern = treffer ? treffer[1] : text;
  const rest = treffer ? treffer[3] : '';

  return (
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-foreground leading-relaxed">{kern}</p>
      {rest && <p className="text-xs italic text-muted-foreground leading-relaxed">{rest}</p>}
    </div>
  );
}