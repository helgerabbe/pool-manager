import React from 'react';
import { FOLIEN_GRUPPEN } from '@/lib/folienElemente';

/** Auswahl der Folienelemente zum Hineinziehen in die Arbeitsfläche. */
export default function ElementPalette() {
  return (
    <aside className="w-64 shrink-0 space-y-5 overflow-y-auto border-r border-border bg-card p-4">
      {FOLIEN_GRUPPEN.map((g) => (
        <div key={g.titel} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.titel}</p>
          {g.hinweis && <p className="text-xs text-muted-foreground">{g.hinweis}</p>}
          <div className="grid grid-cols-2 gap-2">
            {g.elemente.map(({ typ, label, icon: Icon }) => (
              <div key={typ} draggable onDragStart={(e) => e.dataTransfer.setData('neu', typ)}
                className="flex cursor-grab flex-col items-center gap-1 rounded-lg border border-border bg-background p-2 text-center text-xs hover:border-primary hover:bg-primary/5">
                <Icon className="h-5 w-5 text-primary" />{label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}