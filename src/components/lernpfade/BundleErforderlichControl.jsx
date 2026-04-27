/**
 * BundleErforderlichControl.jsx
 *
 * Inline-Stepper am Aufgabenbündel-Header (siehe Logbuch §18 / Phase 4).
 * Zeigt "X von Y" an, mit Y = Anzahl Children und X = `erforderliche_anzahl`
 * aus `bundle_config` (oder = Y, falls bundle_config nicht gesetzt → Default
 * "alle bearbeiten").
 *
 * Verhalten:
 *   - Wert wird auf [1, childCount] geclamped (durchgesetzt vom Helper
 *     `setBundleConfig` in lernpfadeUtils).
 *   - "alle"-Button setzt die Konfig zurück (bundle_config entfernen).
 *   - Versteckt sich wenn childCount === 0 (sinnlos).
 *   - Read-only-Modus: keine Buttons, nur Text.
 *
 * Wird NUR am Aufgabenbündel (`sys_platzhalter_brian_buendel`) gerendert.
 * Lernpaket- und Projektbündel zeigen das Control bewusst nicht.
 */

import React from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function BundleErforderlichControl({
  childCount,
  erforderlicheAnzahl, // number | undefined
  disabled = false,
  onChange, // (number | null) => void   null = "alle"
}) {
  if (!childCount || childCount <= 0) return null;

  const isCustom = typeof erforderlicheAnzahl === 'number' && erforderlicheAnzahl >= 1;
  const effectiveValue = isCustom
    ? Math.min(Math.max(1, erforderlicheAnzahl), childCount)
    : childCount;

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDec = (e) => {
    stop(e);
    if (disabled) return;
    const next = Math.max(1, effectiveValue - 1);
    onChange?.(next === childCount && !isCustom ? null : next);
  };

  const handleInc = (e) => {
    stop(e);
    if (disabled) return;
    const next = Math.min(childCount, effectiveValue + 1);
    // Wenn Inkrement childCount erreicht → Default ("alle") wiederherstellen.
    onChange?.(next >= childCount ? null : next);
  };

  const handleAlle = (e) => {
    stop(e);
    if (disabled) return;
    onChange?.(null);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={stop}
            className={`shrink-0 inline-flex items-center gap-0.5 rounded border border-bundle-border bg-white/80 px-1 py-0.5 text-[10px] font-semibold text-bundle ${
              disabled ? 'opacity-70' : ''
            }`}
          >
            {!disabled && (
              <button
                type="button"
                onClick={handleDec}
                disabled={effectiveValue <= 1}
                className="w-4 h-4 inline-flex items-center justify-center rounded hover:bg-bundle/10 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Eine weniger"
              >
                <Minus className="w-2.5 h-2.5" strokeWidth={3} />
              </button>
            )}
            <span className="px-1 tabular-nums">
              {effectiveValue} von {childCount}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleInc}
                disabled={effectiveValue >= childCount}
                className="w-4 h-4 inline-flex items-center justify-center rounded hover:bg-bundle/10 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Eine mehr"
              >
                <Plus className="w-2.5 h-2.5" strokeWidth={3} />
              </button>
            )}
            {!disabled && isCustom && (
              <button
                type="button"
                onClick={handleAlle}
                className="ml-0.5 w-4 h-4 inline-flex items-center justify-center rounded hover:bg-bundle/10"
                title="Alle Aufgaben sind Pflicht (Standard)"
              >
                <Sparkles className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {isCustom ? (
            <>
              Der Schüler muss <strong>{effectiveValue}</strong> von{' '}
              <strong>{childCount}</strong> Aufgaben bearbeiten.
              <br />
              Klicke auf das ✦, um wieder „alle Pflicht" zu setzen.
            </>
          ) : (
            <>
              <strong>Standard:</strong> Alle {childCount} Aufgaben sind Pflicht.
              <br />
              Mit <strong>−</strong> machst du die Anzahl zu einer Wahl­pflicht
              („X von Y").
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}