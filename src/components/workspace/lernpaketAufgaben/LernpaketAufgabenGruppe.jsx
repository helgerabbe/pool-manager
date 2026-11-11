import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Gruppe „Aufgaben" im Menübaum eines Lernpakets: Aufgabe 1, Aufgabe 2, … (Titel als Tooltip). */
export default function LernpaketAufgabenGruppe({ aufgaben, lernpaket, selectedItem, onSelect }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/60">
        <span className="w-3 shrink-0" />
        ✏️ <span className="uppercase tracking-wide">Aufgaben</span>
      </p>
      <TooltipProvider delayDuration={200}>
        <div className="ml-2 border-l border-border/40 pl-2 space-y-0.5">
          {aufgaben.map((a, i) => {
            const gewaehlt = selectedItem?.type === 'aufgabe' && selectedItem.aufgabeId === a.id;
            return (
              <Tooltip key={a.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelect({ type: 'aufgabe', aufgabeId: a.id, lernpaket })}
                    className={cn(
                      'w-full px-2 py-1.5 rounded-md text-left text-xs transition-colors',
                      gewaehlt ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    Aufgabe {i + 1}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{a.titel?.trim() || 'Ohne Titel'}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}