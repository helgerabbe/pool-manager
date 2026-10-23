import React from 'react';
import { Milestone, Star, Rocket, Users } from 'lucide-react';
import { CI_GRUND, CI_NIVEAU } from '@/lib/folienCI';

const ICONS = { Milestone, Star, Rocket, Users };

/** Vorschau Teil 11: Schwierigkeitsstufen als Abzeichen. */
export default function CiNiveauVorschau() {
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex flex-wrap gap-4">
        {Object.entries(CI_NIVEAU).map(([k, n]) => {
          const Icon = ICONS[n.symbol];
          return (
            <div key={k} className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold" style={{ background: n.hg, color: n.text }}>
                {Array.from({ length: n.anzahl }).map((_, i) => <Icon key={i} className="h-4 w-4" fill={n.symbol === 'Star' ? 'currentColor' : 'none'} />)}
              </span>
              <p className="text-xs text-muted-foreground">{n.name}: {n.beschreibung}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Das Abzeichen steht rechts neben der Überschrift der Aufgabenbox. Eine Stufe je Aufgabe.</p>
    </div>
  );
}