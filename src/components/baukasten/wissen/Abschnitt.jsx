import React from 'react';
import { ChevronDown } from 'lucide-react';

/** Aufklappbarer Abschnitt in den Wissens-Fenstern. */
export default function Abschnitt({ titel, offen = false, children }) {
  const [auf, setAuf] = React.useState(offen);
  return (
    <div className="rounded-lg border bg-card">
      <button onClick={() => setAuf(!auf)} className="flex w-full items-center justify-between px-3 py-2 text-left font-semibold">
        {titel}<ChevronDown className={`h-4 w-4 transition-transform ${auf ? 'rotate-180' : ''}`} />
      </button>
      {auf && <div className="border-t px-3 py-2">{children}</div>}
    </div>
  );
}