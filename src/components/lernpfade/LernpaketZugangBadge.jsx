/**
 * LernpaketZugangBadge.jsx
 *
 * Klickbares Badge am Lernpaket im Lernpfad (2026-08-22): zeigt den Zugang
 * (Standard / Fast-Track / Wissensspeicher) und rotiert per Klick durch die
 * drei Arten. Voreinstellung kommt vom Lerntyp, der Klick überschreibt sie
 * nur für dieses eine Lernpaket in diesem Dashboard.
 */

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LERNPAKET_ZUGANG_REIHENFOLGE,
  ZUGANG_META,
  nextZugang,
} from '@/lib/lernpaketZugang';

export default function LernpaketZugangBadge({ zugang, disabled = false, onChange }) {
  const meta = ZUGANG_META[zugang] || ZUGANG_META.standard;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    onChange?.(nextZugang(zugang));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={`shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border transition-colors ${meta.cls} ${
              disabled ? 'cursor-default opacity-80' : 'hover:brightness-95'
            }`}
          >
            {meta.label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" align="center" className="max-w-xs text-xs leading-relaxed">
          <strong>{meta.label}:</strong> {meta.kurz}
          {!disabled && (
            <>
              <br />
              <br />
              Klicken wechselt den Zugang (nur für dieses Lernpaket in diesem
              Dashboard).
            </>
          )}
          <br />
          <br />
          <span className="opacity-80">
            {LERNPAKET_ZUGANG_REIHENFOLGE.filter((z) => z !== zugang)
              .map((z) => `${ZUGANG_META[z].label}: ${ZUGANG_META[z].kurz}`)
              .join(' · ')}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}