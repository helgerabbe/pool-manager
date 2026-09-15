import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GRAFIK_RICHTUNGEN } from '@/lib/grafikVariante';
import { cn } from '@/lib/utils';

/** Erste Stufe des Grafik-Assistenten: Richtung wählen, optional Wunsch dazu. */
export default function GrafikRichtungWahl({ richtung, onRichtung, wunsch, onWunsch }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {GRAFIK_RICHTUNGEN.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onRichtung(r.key)}
            className={cn(
              'rounded-xl border px-4 py-3 text-left transition-colors',
              richtung === r.key
                ? 'border-violet-400 bg-violet-50 ring-1 ring-violet-300'
                : 'border-border bg-card hover:bg-muted/50',
            )}
          >
            <p className="text-sm font-semibold text-foreground">{r.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.beschreibung}</p>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="grafik-wunsch">Zusätzlicher Wunsch <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="grafik-wunsch"
          value={wunsch}
          onChange={(e) => onWunsch(e.target.value)}
          placeholder="z. B. „ruhige Grüntöne, passend zum Thema Wald“"
          className="min-h-[70px]"
        />
      </div>
    </div>
  );
}