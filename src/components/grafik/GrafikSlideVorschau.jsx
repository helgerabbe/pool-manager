import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SlideScaler from '@/components/slideshow/SlideScaler';
import SlideCanvas from '@/components/slideshow/SlideCanvas';

/** Blättert die Folien im vorgeschlagenen Design durch — Inhalte unverändert. */
export default function GrafikSlideVorschau({ folien = [], design }) {
  const [i, setI] = useState(0);
  const folie = folien[i] || null;
  if (!folie) return <p className="text-sm text-muted-foreground italic">Keine Folien vorhanden.</p>;

  return (
    <div className="space-y-2">
      <SlideScaler className="rounded-lg shadow-md ring-1 ring-slate-300">
        <SlideCanvas folie={folie} modus="view" design={design} />
      </SlideScaler>
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">Folie {i + 1} von {folien.length}</span>
        <Button variant="outline" size="sm" onClick={() => setI((v) => Math.min(folien.length - 1, v + 1))} disabled={i >= folien.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}