/**
 * LernpaketInnenModusToggle.jsx
 *
 * Sequenziell/Frei-Toggle für die Bearbeitung INNERHALB eines einzelnen
 * Lernpakets (2026-07-18): Ersetzt die frühere Drei-Wege-Logik
 * (standard | fast_track | wissensspeicher) durch das systemweit einheitliche
 * Zwei-Wege-Muster:
 *   - 'sequenziell' (Default) → Aktivitäten des Lernpakets werden von oben
 *     nach unten in fester Reihenfolge abgearbeitet.
 *   - 'frei'                  → Schüler können jede Aktivität im Lernpaket
 *     jederzeit öffnen (offener Wissensspeicher).
 *
 * Wird am Lernpaketebündel-Item gepflegt (bundle_config.lernpaket_modus) —
 * pro Lerntyp-Dashboard einstellbar (Standard-Vorlagen-Editor). Optisch
 * identisch zum BundleModusToggle, mit Paket-Symbol als Unterscheidung.
 */

import React from 'react';
import { ListOrdered, Shuffle, Package } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function LernpaketInnenModusToggle({
  modus, // 'sequenziell' | 'frei' | undefined (Default: sequenziell)
  disabled = false,
  onChange,
}) {
  const effective = modus === 'frei' ? 'frei' : 'sequenziell';

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSet = (e, val) => {
    stop(e);
    if (disabled) return;
    if (val === effective) return;
    onChange?.(val);
  };

  const tooltipText =
    effective === 'sequenziell'
      ? 'Innerhalb jedes Lernpakets: Aktivitäten werden in fester Reihenfolge bearbeitet.'
      : 'Innerhalb jedes Lernpakets: Schüler wählen die Reihenfolge der Aktivitäten selbst.';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={stop}
            className={`shrink-0 inline-flex items-center gap-0.5 rounded border border-bundle-border bg-white/80 p-0.5 text-[10px] font-semibold ${
              disabled ? 'opacity-70' : ''
            }`}
          >
            <Package className="w-2.5 h-2.5 text-bundle ml-0.5" strokeWidth={2.5} />
            <button
              type="button"
              onClick={(e) => handleSet(e, 'sequenziell')}
              disabled={disabled}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${
                effective === 'sequenziell'
                  ? 'bg-bundle text-bundle-foreground'
                  : 'text-bundle hover:bg-bundle/10'
              } ${disabled ? 'cursor-not-allowed' : ''}`}
              title="Sequenziell"
            >
              <ListOrdered className="w-2.5 h-2.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={(e) => handleSet(e, 'frei')}
              disabled={disabled}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${
                effective === 'frei'
                  ? 'bg-bundle text-bundle-foreground'
                  : 'text-bundle hover:bg-bundle/10'
              } ${disabled ? 'cursor-not-allowed' : ''}`}
              title="Frei"
            >
              <Shuffle className="w-2.5 h-2.5" strokeWidth={2.5} />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}