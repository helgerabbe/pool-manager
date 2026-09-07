/**
 * KiFolienVorschau.jsx
 *
 * Rechte Spalte des Slideshow-Assistenten: der erzeugte Foliensatz WYSIWYG,
 * genau so, wie die Schüler:innen ihn später sehen — mit Blättern durch die
 * Folien und den bisherigen Ständen.
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SlideScaler from '@/components/slideshow/SlideScaler';
import SlideCanvas from '@/components/slideshow/SlideCanvas';
import { cn } from '@/lib/utils';

export default function KiFolienVorschau({ folien, staende, index, onSpringeZu }) {
  const [i, setI] = useState(0);

  // Neuer Stand → wieder bei Folie 1 anfangen.
  useEffect(() => { setI(0); }, [index, folien.length]);

  const folie = folien[i] || null;

  if (!folien.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8 text-muted-foreground">
        <Presentation className="w-10 h-10 opacity-40" />
        <p className="text-sm max-w-xs">
          Hier erscheinen die Folien, sobald die KI sie gebaut hat – genau so, wie die Schüler:innen sie sehen.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col justify-center">
        <SlideScaler className="rounded-lg shadow-md ring-1 ring-slate-300 bg-white">
          <SlideCanvas folie={folie} modus="view" />
        </SlideScaler>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Folie {i + 1} von {folien.length}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={i >= folien.length - 1} onClick={() => setI(i + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {folien.map((f, idx) => (
            <button key={f.id || idx} type="button" onClick={() => setI(idx)} className={cn('rounded border p-0.5', idx === i ? 'border-primary ring-1 ring-primary/40' : 'border-border')}>
              <SlideScaler><SlideCanvas folie={f} modus="view" /></SlideScaler>
            </button>
          ))}
        </div>
      </div>

      {staende.length > 1 && (
        <div className="shrink-0 border-t border-border px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {staende.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSpringeZu(idx)}
              className={cn(
                'shrink-0 text-[11px] rounded-full px-2.5 py-1 border',
                idx === index ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}