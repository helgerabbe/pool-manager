import React from 'react';
import { KeyRound } from 'lucide-react';
import { phasenTypMeta } from '@/lib/stundenPhasen';

/** Linke Spalte: der Stundenverlauf als Menü. */
export default function PhasenLeiste({ phasen, aktivId, onWahl }) {
  return (
    <nav className="space-y-1">
      {phasen.map((p, i) => {
        const aktiv = p.id === aktivId;
        return (
          <button
            key={p.id}
            onClick={() => onWahl(p.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${phasenTypMeta(p.typ).rand} ${
              aktiv ? 'bg-primary/10 border-primary/40' : 'bg-card hover:bg-muted'
            }`}
          >
            <p className="text-sm font-medium">{i + 1}. {p.phasenname || 'Phase'}</p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {p.dauer_minuten ? `${p.dauer_minuten} Min.` : '–'}
              {p.freischalt_code && !p.code_deaktiviert && <span className="inline-flex items-center gap-0.5"><KeyRound className="h-3 w-3" />{p.freischalt_code}</span>}
            </p>
          </button>
        );
      })}
    </nav>
  );
}