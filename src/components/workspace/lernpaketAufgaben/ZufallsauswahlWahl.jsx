import React from 'react';
import { Shuffle } from 'lucide-react';

/** Zufallsauswahl einer Aufgabe: „Alle" oder „X von N" Elementen. */
export default function ZufallsauswahlWahl({ anzahl, elemente, onChange, disabled }) {
  const wert = anzahl > 0 && anzahl < elemente ? anzahl : 0;
  return (
    <label
      className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 h-7 text-[11px] text-muted-foreground"
      title="Zufallsauswahl: Jeder Schüler bearbeitet nur so viele zufällig gezogene Elemente dieser Aufgabe"
    >
      <Shuffle className="w-3 h-3" />
      <select
        value={wert}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="bg-transparent text-foreground outline-none disabled:opacity-60"
      >
        <option value={0}>Alle</option>
        {Array.from({ length: elemente - 1 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n} von {elemente}</option>
        ))}
      </select>
    </label>
  );
}