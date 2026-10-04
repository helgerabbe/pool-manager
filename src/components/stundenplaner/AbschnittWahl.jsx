import React from 'react';

/** Schritt 1: Abschnitt aus dem echten Verlauf der Einheit wählen. */
export default function AbschnittWahl({ verlauf, onWahl }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Welchen Abschnitt deines Verlaufs möchtest du als Stunde planen?</p>
      <ol className="space-y-2">
        {verlauf.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={s.gewichtung === 'raus'}
              onClick={() => onWahl(s)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left hover:border-primary disabled:opacity-40"
            >
              <span>
                <span className="text-xs text-muted-foreground">{i + 1} · {s.schwerpunkt}</span>
                <span className="block text-sm font-semibold">{s.titel}</span>
                {s.lernziel && <span className="block text-xs text-muted-foreground">{s.lernziel}</span>}
              </span>
              {s.minuten > 0 && <span className="whitespace-nowrap text-xs font-semibold text-primary">{s.minuten} Min.</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}