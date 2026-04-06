/**
 * PhaseAccordionSection.jsx
 *
 * Akkordion-Element für Phasen-Container im Hauptbereich.
 * - Interaktiver Header mit Chevron und Hover-Effekt
 * - Anzahl der Aktivitäten im geschlossenen Zustand anzeigen
 * - Flüssige Animation beim Auf/Zuklappen
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PhaseAccordionSection({
  phase,
  activities,
  isExpanded,
  onToggle,
  children,
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      {/* Header: Interaktiv mit Hover-Effekt und Chevron */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left transition-all',
          'hover:bg-muted/50 active:bg-muted',
          'cursor-pointer'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{phase.icon}</span>
          <span className="font-semibold text-foreground">{phase.label}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Aktivitäts-Count Badge (bei geschlossenem Akkordion sichtbar) */}
          {!isExpanded && activities.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
              {activities.length} {activities.length === 1 ? 'Aktivität' : 'Aktivitäten'}
            </span>
          )}

          {/* Chevron mit Animation */}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Akkordion-Inhalt mit Animation */}
      {isExpanded && (
        <div className="border-t border-border/50 bg-card/50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 space-y-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}