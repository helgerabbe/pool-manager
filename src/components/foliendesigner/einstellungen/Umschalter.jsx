import React from 'react';

/** Auswahl zwischen wenigen Möglichkeiten, z. B. eckig / abgerundet. */
export default function Umschalter({ titel, optionen, wert, setze }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{titel}</p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
        {optionen.map(([k, label, klasse]) => (
          <button key={k} type="button" onClick={() => setze(k)}
            className={`flex-1 rounded-md px-2 py-1 text-sm ${klasse || ''} ${wert === k ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground'}`}>{label}</button>
        ))}
      </div>
    </div>
  );
}