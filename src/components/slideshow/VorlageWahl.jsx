/**
 * VorlageWahl.jsx
 *
 * Die sechs festen Folien-Vorlagen als kleine Schemabilder zur Auswahl.
 */
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { VORLAGEN, SLIDE_W, SLIDE_H } from '@/lib/slideshowVorlagen';
import { cn } from '@/lib/utils';

function Schema({ vorlage }) {
  return (
    <div className="relative w-full bg-white rounded border border-border overflow-hidden" style={{ aspectRatio: `${SLIDE_W} / ${SLIDE_H}` }}>
      {vorlage.slots.map((s) => (
        <div
          key={s.key}
          className={cn(
            'absolute rounded-[2px] flex items-center justify-center',
            s.art === 'bild' ? 'bg-sky-100 border border-sky-300 text-sky-500' : 'bg-slate-200'
          )}
          style={{
            left: `${(s.box.left / SLIDE_W) * 100}%`, top: `${(s.box.top / SLIDE_H) * 100}%`,
            width: `${(s.box.width / SLIDE_W) * 100}%`, height: `${(s.box.height / SLIDE_H) * 100}%`,
          }}
        >
          {s.art === 'bild' && <ImageIcon className="w-3 h-3" />}
        </div>
      ))}
    </div>
  );
}

export default function VorlageWahl({ value, onSelect, kompakt = false }) {
  return (
    <div className={cn('grid gap-2', kompakt ? 'grid-cols-2' : 'grid-cols-3')}>
      {VORLAGEN.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onSelect?.(v.key)}
          className={cn(
            'rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/60',
            value === v.key ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'border-border'
          )}
        >
          <Schema vorlage={v} />
          <p className="mt-1 text-[11px] font-medium text-foreground leading-tight truncate">{v.label}</p>
        </button>
      ))}
    </div>
  );
}