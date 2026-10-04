import React from 'react';
import { Check } from 'lucide-react';

/** Umsetzung einer Phase: bei mehreren Möglichkeiten wählbar, bei nur einer direkt gesetzt. */
export default function UmsetzungsWahl({ optionen, standard }) {
  const [gewaehlt, setGewaehlt] = React.useState(standard || optionen[0]);
  const waehlbar = optionen.length > 1;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {waehlbar && <span className="text-[11px] font-normal text-muted-foreground">beides möglich:</span>}
      {optionen.map((o) => {
        const aktiv = o === gewaehlt;
        return (
          <button
            key={o}
            type="button"
            disabled={!waehlbar}
            onClick={() => setGewaehlt(o)}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
              aktiv ? 'border-green-600 bg-green-600 text-white' : 'border-border bg-card text-muted-foreground hover:bg-muted'
            } ${waehlbar ? '' : 'cursor-default'}`}
          >
            {aktiv && <Check className="h-3 w-3" />}{o}
          </button>
        );
      })}
    </span>
  );
}