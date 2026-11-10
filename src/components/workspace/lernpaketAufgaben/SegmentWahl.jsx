import React from 'react';
import { cn } from '@/lib/utils';

/** Kleiner Umschalter mit zwei oder drei festen Optionen. */
export default function SegmentWahl({ optionen, value, onChange, disabled = false }) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-border overflow-hidden">
      {optionen.map((o) => {
        const aktiv = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            title={o.title}
            disabled={disabled}
            onClick={() => !aktiv && onChange(o.value)}
            className={cn(
              'px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed',
              aktiv
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted disabled:hover:bg-card',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}