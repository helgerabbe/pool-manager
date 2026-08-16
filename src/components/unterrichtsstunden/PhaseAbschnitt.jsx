/**
 * Aufklappbarer Abschnitt im Phasen-Arbeitsbereich (z. B. Regieanweisung,
 * Materialien). Standardmäßig eingeklappt, damit optionale Felder nicht wie
 * Pflichtfelder wirken.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PhaseAbschnitt({ titel, hinweis, gefuellt = false, children }) {
  const [offen, setOffen] = useState(false);

  return (
    <div className="rounded-md border bg-card">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground"
      >
        {titel}
        {hinweis && <span className="text-xs font-normal text-muted-foreground">{hinweis}</span>}
        {gefuellt && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        {offen
          ? <ChevronUp className="w-4 h-4 ml-auto text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />}
      </button>
      {offen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}