import React from 'react';

/** Vorschau der Elemente Skala, Legeboard, Text markieren und Punktestand (nur Darstellung). */
export default function NeueInhalte({ typ }) {
  if (typ === 'skala') return (
    <div className="w-full space-y-1">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-destructive via-accent to-chart-3">
        {['left-[20%]', 'left-[55%]', 'left-[70%]'].map((l) => <span key={l} className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-background bg-foreground ${l}`} />)}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground"><span>stimme nicht zu</span><span>stimme zu</span></div>
    </div>
  );
  if (typ === 'legeboard') return (
    <svg viewBox="0 0 200 110" className="h-full w-full">
      <line x1="50" y1="25" x2="150" y2="25" className="stroke-muted-foreground" strokeWidth="1.5" />
      <line x1="50" y1="25" x2="100" y2="85" className="stroke-muted-foreground" strokeWidth="1.5" />
      {[[20, 12, 'Begriff'], [120, 12, 'Ursache'], [70, 72, 'Folge']].map(([x, y, t]) => (
        <g key={t}><rect x={x} y={y} width="60" height="26" rx="5" className="fill-background stroke-primary" strokeWidth="1.5" /><text x={x + 30} y={y + 17} textAnchor="middle" fontSize="11" className="fill-foreground">{t}</text></g>
      ))}
    </svg>
  );
  if (typ === 'markieren') return (
    <p className="w-full text-sm leading-relaxed">Der Text wird <mark className="rounded bg-accent/40 px-0.5">gezielt markiert</mark>, wichtige Stellen werden <mark className="rounded bg-chart-3/30 px-0.5">farbig</mark> hervorgehoben.</p>
  );
  return (
    <div className="w-full space-y-1">
      {[['Team A', 120], ['Team B', 90], ['Team C', 60]].map(([t, p], i) => (
        <div key={t} className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1 text-sm"><span>{i + 1}. {t}</span><span className="font-bold tabular-nums">{p}</span></div>
      ))}
    </div>
  );
}