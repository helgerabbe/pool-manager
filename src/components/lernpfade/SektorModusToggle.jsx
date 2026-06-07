/**
 * SektorModusToggle.jsx
 *
 * Sequenziell/Frei-Toggle am Sektor-Header. Grafisch identisch zum
 * BundleModusToggle (gleiche Icons ListOrdered/Shuffle), aber in neutralen
 * Sektor-Farben statt Bündel-Lila, damit beide Ebenen optisch unterscheidbar
 * bleiben.
 *
 * - 'sequenziell' (Default): Schüler bearbeiten die Elemente des Sektors in
 *   fester Reihenfolge (von oben nach unten). Ein Bündel im Sektor zählt dabei
 *   als ein einzelner Schritt — innerhalb des Bündels gilt dessen eigener Modus.
 * - 'frei': alle Elemente des Sektors sind jederzeit anklickbar.
 *
 * Schreibt über `onChange(modus)` zurück. Der Aufrufer (Cockpit) ruft
 * `patchSektor(..., { modus })` auf.
 */

import React from 'react';
import { ListOrdered, Shuffle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function SektorModusToggle({ modus, disabled = false, onChange }) {
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
      ? 'Sequenziell: Schüler arbeiten die Elemente des Sektors der Reihe nach ab. Ein Bündel zählt dabei als ein Schritt.'
      : 'Frei: Schüler können alle Elemente des Sektors in beliebiger Reihenfolge anklicken.';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={stop}
            className={`shrink-0 inline-flex items-center rounded border border-border bg-white/80 p-0.5 text-[10px] font-semibold ${
              disabled ? 'opacity-70' : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => handleSet(e, 'sequenziell')}
              disabled={disabled}
              className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors ${
                effective === 'sequenziell'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary hover:bg-primary/10'
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
                  ? 'bg-primary text-primary-foreground'
                  : 'text-primary hover:bg-primary/10'
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