import React from 'react';
import { Lock } from 'lucide-react';

/** Sichtbarer Übergang im E-Plan: ab hier beginnt der Bereich nach der schriftlichen Arbeit. */
export default function AbschnittTrenner() {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="h-px flex-1 bg-violet-300" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-800">
        <Lock className="h-3 w-3" /> Nach der schriftlichen Arbeit · Projektbereich
      </span>
      <span className="h-px flex-1 bg-violet-300" />
    </div>
  );
}