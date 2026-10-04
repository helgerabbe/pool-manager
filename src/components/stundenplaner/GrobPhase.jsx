import React from 'react';
import { ChevronDown, GraduationCap } from 'lucide-react';

/** Eine Phase im Grobentwurf mit aufklappbarer didaktischer Analyse. */
export default function GrobPhase({ phase, nr }) {
  const [offen, setOffen] = React.useState(false);
  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{nr} · {phase.art} · {phase.sozialform}</p>
          <p className="text-sm font-semibold">{phase.titel}</p>
          <p className="mt-1 text-sm">{phase.idee}</p>
        </div>
        <span className="whitespace-nowrap text-xs font-semibold text-primary">{phase.minuten} Min.</span>
      </div>
      <button type="button" onClick={() => setOffen(!offen)} className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
        <GraduationCap className="h-3.5 w-3.5" /> Didaktische Analyse
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs">{phase.analyse}</p>}
    </li>
  );
}