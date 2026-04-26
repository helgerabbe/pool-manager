/**
 * InfoHint.jsx
 *
 * Kleiner Hilfe-Button als runder Info-Kreis (HelpCircle).
 * Auf Hover/Klick öffnet sich ein Tooltip mit kurzer Direkt-Hilfe.
 *
 * Wird neben Buttons platziert, deren Funktion nicht selbsterklärend ist
 * (z. B. "Prüfen & freigeben", "Pfad kopieren", "Quick-Add", "Sektor hinzufügen").
 */

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function InfoHint({ title, children, side = 'bottom' }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Direkthilfe öffnen"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed bg-slate-900 text-slate-50">
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div className="text-slate-200">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}