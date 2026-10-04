import React from 'react';
import { ChevronDown } from 'lucide-react';

const STATUS = [
  { wert: 'ja', label: 'So gelaufen', aktiv: 'bg-chart-3 text-primary-foreground border-chart-3' },
  { wert: 'anders', label: 'Anders gelaufen', aktiv: 'bg-accent text-accent-foreground border-accent' },
  { wert: 'nein', label: 'Nicht durchgeführt', aktiv: 'bg-destructive text-destructive-foreground border-destructive' },
];

/** Aufklappbare Liste der Abschnitte vor der geplanten Stunde. */
export default function VorherigeAbschnitte({ abschnitte, status, setStatus }) {
  const [offen, setOffen] = React.useState(false);
  return (
    <div className="rounded-lg border bg-card">
      <button type="button" onClick={() => setOffen(!offen)} className="flex w-full items-center justify-between p-3 text-left text-sm">
        <span>Sind die {abschnitte.length} Abschnitte davor so gelaufen wie geplant?</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && (
        <ol className="space-y-2 border-t p-3">
          {abschnitte.map((a, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{i + 1}. {a.titel}</span>
              <span className="flex gap-1">
                {STATUS.map((s) => (
                  <button key={s.wert} type="button" onClick={() => setStatus(status.map((v, j) => (j === i ? s.wert : v)))}
                    className={`rounded-full border px-2 py-0.5 text-xs ${status[i] === s.wert ? s.aktiv : 'text-muted-foreground'}`}>
                    {s.label}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}