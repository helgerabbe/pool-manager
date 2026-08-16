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
    <p className="text-sm text-foreground leading-relaxed">
      <span className="font-semibold">{kern}</span>
      {rest && <span className="text-muted-foreground"> {rest}</span>}
    </p>
  );
}