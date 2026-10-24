import React from 'react';
import { ChevronDown } from 'lucide-react';

/** Dezente, aufklappbare Box für Zusatzinhalte. */
export default function AufklappBox({ titel, children, offen: start = false }) {
  const [offen, setOffen] = React.useState(start);
  return (
    <div className="rounded-xl border bg-card">
      <button onClick={() => setOffen(!offen)} className="flex w-full items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
        {titel}<ChevronDown className={`h-4 w-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && <div className="space-y-2 border-t p-3">{children}</div>}
    </div>
  );
}