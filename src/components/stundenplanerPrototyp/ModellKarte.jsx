import React from 'react';
import { HelpCircle } from 'lucide-react';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { MODELL_ERKLAERUNG } from '@/lib/stundenplanerPrototypDaten';

/** Ein Stundenmodell mit Phasen und einfacher Erklärung zum Aufklappen. */
export default function ModellKarte({ modellKey, hervorgehoben, text, children }) {
  const [hilfe, setHilfe] = React.useState(false);
  const m = STUNDEN_MODELLE.find((x) => x.key === modellKey);
  return (
    <div className={`rounded-xl border p-4 ${hervorgehoben ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{m.name}</p>
          {text && <p className="mt-1 text-sm text-muted-foreground">{text}</p>}
        </div>
        {children}
      </div>
      {hervorgehoben && (
        <div className="mt-3 flex flex-wrap gap-1">
          {m.phasen.map((ph, i) => <span key={ph} className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border">{i + 1}. {ph}</span>)}
        </div>
      )}
      <button className="mt-2 flex items-center gap-1 text-xs text-primary" onClick={() => setHilfe(!hilfe)}>
        <HelpCircle className="h-3 w-3" /> {hilfe ? 'Erklärung ausblenden' : 'Was heißt das?'}
      </button>
      {hilfe && <p className="mt-2 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{MODELL_ERKLAERUNG[modellKey]}</p>}
    </div>
  );
}