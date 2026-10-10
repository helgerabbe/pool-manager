import React from 'react';
import { Trash2, BookMarked } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ABSCHNITTE } from '@/lib/fachregisterAbschnitte';

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
          <Link to={`/fachregister/${e.id}`} className="flex-1 font-medium hover:text-primary hover:underline">{e.titel}</Link>
          {(() => {
            const n = ABSCHNITTE.filter((a) => (e[a.key] || '').trim()).length;
            const cls = n === ABSCHNITTE.length ? 'bg-green-100 text-green-800' : n ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground';
            return <span className={`rounded px-2 py-0.5 text-xs ${cls}`} title="Befüllte Abschnitte">{n ? `${n}/${ABSCHNITTE.length} befüllt` : 'leer'}</span>;
          })()}
          {(e.kurse || []).map((k) => <span key={k} className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{k}</span>)}
          {onLoeschen && (
            <button onClick={() => window.confirm(`„${e.titel}“ löschen?`) && onLoeschen(e.id)}
              className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100" aria-label="Löschen">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}