import React from 'react';
import { cn } from '@/lib/utils';
import { HINWEIS_ORTE, hinweisOrt } from '@/lib/hinweisOrt';

/** Aufteilung der Hinweisliste: übergreifend, an Aufgaben, im Kurs schon geändert. */
export default function MbkBereichWahl({ befunde, bereich, onBereich }) {
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(HINWEIS_ORTE).map(([key, ort]) => (
          <button key={key} type="button" onClick={() => onBereich(key)}
            className={cn('px-3 py-1.5 rounded-md border text-sm font-medium',
              bereich === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted')}>
            {ort.label} ({befunde.filter((b) => hinweisOrt(b) === key).length})
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{HINWEIS_ORTE[bereich].text}</p>
    </div>
  );
}