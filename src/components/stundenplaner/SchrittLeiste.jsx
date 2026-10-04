import React from 'react';
import { Check } from 'lucide-react';
import { SCHRITTE } from '@/lib/stundenplanerVorschauDaten';

export default function SchrittLeiste({ aktiv, onWahl }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {SCHRITTE.map((s, i) => (
        <li key={s}>
          <button
            type="button"
            disabled={i > aktiv}
            onClick={() => onWahl(i)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              i === aktiv ? 'border-primary bg-primary text-primary-foreground' : i < aktiv ? 'border-primary/40 text-primary' : 'text-muted-foreground'
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20">
              {i < aktiv ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {s}
          </button>
        </li>
      ))}
    </ol>
  );
}