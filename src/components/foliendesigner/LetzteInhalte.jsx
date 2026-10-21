import React from 'react';
import { Dices, AppWindow, Mic } from 'lucide-react';

/** Vorschau: Zufallsgenerator, externe Seite, Kreuzworträtsel, Erklärvideo-Aufnahme. */
export default function LetzteInhalte({ el }) {
  if (el.typ === 'zufall') {
    const art = el.art_zufall || 'rad';
    if (art === 'wuerfel') return <div className="flex h-full w-full items-center justify-center"><Dices className="h-16 w-16 text-primary" /></div>;
    if (art === 'namen') return <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-primary bg-primary/5"><p className="text-xs text-muted-foreground">Gezogen:</p><p className="text-xl font-bold text-primary">Mia</p></div>;
    return <div className="aspect-square h-full rounded-full border-4 border-foreground" style={{ background: 'conic-gradient(hsl(var(--primary)) 0 25%, hsl(var(--accent)) 0 50%, hsl(var(--chart-3)) 0 75%, hsl(var(--chart-4)) 0)' }} />;
  }
  if (el.typ === 'extern') return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div className="truncate border-b border-border bg-muted px-2 py-1 text-xs text-muted-foreground">{el.url || 'Externe Seite'}</div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground"><AppWindow className="h-8 w-8" /></div>
    </div>
  );
  if (el.typ === 'raster') return (
    <div className="grid h-full w-full grid-cols-6 grid-rows-4 gap-0.5">
      {Array.from({ length: 24 }).map((_, i) => <div key={i} className={[1, 7, 13, 14, 15, 16, 19].includes(i) ? 'border border-foreground bg-background' : ''} />)}
    </div>
  );
  return (
    <div className="flex h-full w-full flex-col gap-1">
      <div className="flex-1 rounded-md border border-input bg-background" />
      <div className="flex items-center gap-2 text-xs text-destructive"><Mic className="h-4 w-4" />Erklärung aufnehmen</div>
    </div>
  );
}