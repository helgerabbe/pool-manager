import React from 'react';
import { Trash2, BookMarked } from 'lucide-react';

/** Einheiten eines Fachs und Jahrgangs im Fachregister. */
export default function EinheitenListe({ einheiten, onLoeschen }) {
  if (!einheiten.length) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Noch keine Einheiten in diesem Jahrgang.</p>;
  }
  return (
    <ul className="space-y-2">
      {einheiten.map((e) => (
        <li key={e.id} className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
          <BookMarked className="h-4 w-4 text-primary" />
          <span className="flex-1 font-medium">{e.titel}</span>
          <button onClick={() => window.confirm(`„${e.titel}“ löschen?`) && onLoeschen(e.id)}
            className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}