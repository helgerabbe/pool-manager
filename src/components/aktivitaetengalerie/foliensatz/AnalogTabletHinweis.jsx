import React from 'react';
import { Presentation, Eye } from 'lucide-react';
import { CI_GRUND, CI_FOLIENTYPEN, CI_SYMBOL_STIL } from '@/lib/folienCI';

const kreis = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

/** Schüler-Tablet bei analogen Übungen: CI-Rahmen mit Tafel- und Augen-Symbol und dem festen Hinweis. */
export default function AnalogTabletHinweis({ text, folientyp = 'aufgabe' }) {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund, color: CI_GRUND.text }}>
      <div className="pointer-events-none absolute -right-[12.5%] -top-[27.8%] aspect-square w-[47%] rounded-full" style={{ background: CI_FOLIENTYPEN[folientyp]?.farbe }} />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <div className="flex gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={kreis}><Presentation className="h-6 w-6" /></span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full" style={kreis}><Eye className="h-6 w-6" /></span>
        </div>
        <p className="max-w-sm text-sm">{text}</p>
      </div>
    </div>
  );
}