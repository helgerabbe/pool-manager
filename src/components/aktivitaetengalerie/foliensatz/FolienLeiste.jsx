import React from 'react';
import { Loader2 } from 'lucide-react';
import FolieAnzeige from './FolieAnzeige';

/** Linke Leiste: alle Folien in Reihenfolge mit Phase und Kanal. */
export default function FolienLeiste({ folien, aktiv, setAktiv }) {
  return (
    <div className="w-48 shrink-0 space-y-2 overflow-y-auto pr-1">
      {folien.map((f, i) => (
        <button key={f.id} onClick={() => setAktiv(f.id)}
          className={`w-full rounded-lg border p-1.5 text-left transition ${aktiv === f.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}>
          {f.status === 'fertig'
            ? <FolieAnzeige folie={f} klein />
            : <div className="flex aspect-video items-center justify-center rounded-md bg-muted">{f.status === 'baut' ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="text-[10px] text-muted-foreground">{f.status === 'fehler' ? 'Fehler' : 'wartet'}</span>}</div>}
          <p className="mt-1 truncate text-xs font-medium">{i + 1}. {f.titel}</p>
          <div className="flex gap-1 text-[10px]">
            <span className="rounded bg-muted px-1">{f.phase}</span>
            {f.platzhalter && <span className="rounded border border-dashed px-1">Platzhalter</span>}
            <span className={`rounded px-1 ${f.kanal === 'digital' ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent'}`}>{f.kanal}</span>
          </div>
        </button>
      ))}
    </div>
  );
}