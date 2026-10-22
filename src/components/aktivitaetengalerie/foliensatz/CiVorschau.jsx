import React from 'react';
import { PenLine, Lightbulb, Info } from 'lucide-react';
import { CI_GRUND, CI_BOXEN, CI_FOLIENTYPEN, CI_BILD } from '@/lib/folienCI';

const ICONS = { PenLine, Lightbulb, Info };
const BEISPIEL = { aufgabe: 'Lies den Text und notiere drei Gedanken.', merksatz: 'Ein Kreis hat überall den gleichen Abstand zum Mittelpunkt.', hinweis: 'In dieser Phase arbeitest du still und allein.' };

/** Vorschau der festgelegten Gestaltungsregeln (Teil 1). */
export default function CiVorschau() {
  return (
    <div className="space-y-4 overflow-y-auto">
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(CI_FOLIENTYPEN).map(([k, t]) => (
          <div key={k} className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full" style={{ background: t.farbe }} />
            <p className="relative p-3 text-sm font-semibold">{t.name}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
        {Object.entries(CI_BOXEN).map(([k, b]) => {
          const Icon = ICONS[b.symbol];
          return (
            <div key={k} className="rounded-xl border-2 p-3" style={{ background: b.hg, borderColor: b.rand, color: b.text }}>
              <p className="flex items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4" />{b.titel}</p>
              <p className="text-sm">{BEISPIEL[k]}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Bilder: {CI_BILD}</p>
    </div>
  );
}