import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Bestehende Lernziele eines Pakets mit dem Befund der Werkstatt:
 * belegt (im Material geübt) oder nicht belegt (im Material nicht zu finden).
 */
export default function LernzielWerkstattBestand({ ziele = [], bestand = [] }) {
  const befund = new Map(bestand.map((b) => [b.id, b]));
  const nichtBelegt = bestand.filter((b) => b.status === 'nicht_belegt').length;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        Eingetragene Lernziele
        <span className="text-xs font-normal text-muted-foreground">
          ({ziele.length - nichtBelegt} von {ziele.length} im Material belegt)
        </span>
      </h3>
      {ziele.length === 0 && (
        <p className="text-sm text-muted-foreground">Noch keine Lernziele eingetragen.</p>
      )}
      <ul className="space-y-2">
        {ziele.map((z) => {
          const b = befund.get(z.id);
          const ok = !b || b.status === 'belegt';
          return (
            <li
              key={z.id}
              className={`rounded-lg border p-3 text-sm flex gap-3 ${ok ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-300 bg-amber-50/60'}`}
            >
              {ok
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="font-medium text-foreground">{z.formulierung_fachsprache}</p>
                {b?.hinweis && <p className="text-xs text-muted-foreground mt-1">{b.hinweis}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}