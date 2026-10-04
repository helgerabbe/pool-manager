import React from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';

/** Aufklappbare Begründung: Welches didaktische Modell steckt hinter dem Ablauf? */
export default function DidaktischesModell({ modell }) {
  const [offen, setOffen] = React.useState(false);
  if (!modell) return null;
  return (
    <div className="rounded-lg border bg-primary/5 p-3">
      <button type="button" onClick={() => setOffen(!offen)} className="flex w-full items-center gap-2 text-left text-sm font-medium text-primary">
        <Lightbulb className="h-4 w-4" /> Warum sieht der Ablauf so aus?
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && (
        <div className="mt-3 space-y-2 text-sm">
          <p>Das ist eine <strong>{modell.name}</strong>. {modell.erklaerung}</p>
          {modell.schritte?.length > 0 && <>
            <p>Eine solche Stunde baut sich standardmäßig aus diesen Schritten auf:</p>
            <ol className="list-decimal space-y-1 pl-5">{modell.schritte.map((s) => <li key={s}>{s}</li>)}</ol>
          </>}
        </div>
      )}
    </div>
  );
}