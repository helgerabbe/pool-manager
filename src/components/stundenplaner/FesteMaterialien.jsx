import React from 'react';
import { Paperclip, Globe } from 'lucide-react';
import { FESTE_MATERIALIEN } from '@/lib/stundenplanerVorschauDaten';

/** Liste der Materialien, die auf jeden Fall in der Stunde verwendet werden. */
export default function FesteMaterialien() {
  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
      <p className="text-sm font-semibold">Diese Materialien verwenden wir auf jeden Fall</p>
      <ul className="mt-2 space-y-1.5">
        {FESTE_MATERIALIEN.map((m) => (
          <li key={m.name} className="flex items-start gap-2 text-sm">
            {m.herkunft === 'internet'
              ? <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              : <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
            <span>{m.name} <span className="text-xs text-muted-foreground">· {m.phase}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Alles in dieser Liste übergeben wir beim Anlegen vollständig an die Aufgaben.</p>
    </div>
  );
}