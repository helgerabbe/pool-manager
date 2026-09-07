/**
 * SlideshowReadOnly.jsx
 *
 * Inhaltsansicht der Aktivität „Slideshow" im Lernpaket (Tab 4): alle Folien
 * als Miniaturen — so sieht die Lehrkraft den Stand ohne den Editor zu öffnen.
 */
import React from 'react';
import { Presentation } from 'lucide-react';
import SlideScaler from '@/components/slideshow/SlideScaler';
import SlideCanvas from '@/components/slideshow/SlideCanvas';

export default function SlideshowReadOnly({ fieldValues = {} }) {
  const folien = Array.isArray(fieldValues.slides) ? fieldValues.slides : [];
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      {fieldValues.aufgabentext && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
          <p className="whitespace-pre-wrap leading-relaxed">{fieldValues.aufgabentext}</p>
        </div>
      )}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Presentation className="w-3.5 h-3.5 text-sky-600" />
        Slideshow ({folien.length} {folien.length === 1 ? 'Folie' : 'Folien'})
      </p>
      {folien.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Noch keine Folien angelegt.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {folien.map((f, i) => (
            <div key={f.id || i} className="relative">
              <SlideScaler className="rounded-lg border border-border shadow-sm">
                <SlideCanvas folie={f} modus="view" />
              </SlideScaler>
              <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-slate-800/80 text-white text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}