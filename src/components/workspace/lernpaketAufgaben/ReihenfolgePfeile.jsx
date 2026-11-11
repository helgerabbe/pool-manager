import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const KNOPF = 'flex h-4 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:pointer-events-none';

/** Zwei schmale Pfeile untereinander, um eine Zeile nach oben oder unten zu schieben. */
export default function ReihenfolgePfeile({ erste, letzte, onHoch, onRunter, disabled = false }) {
  return (
    <div className="flex shrink-0 flex-col">
      <button type="button" className={KNOPF} onClick={onHoch} disabled={disabled || erste} title="Nach oben schieben">
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={KNOPF} onClick={onRunter} disabled={disabled || letzte} title="Nach unten schieben">
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}