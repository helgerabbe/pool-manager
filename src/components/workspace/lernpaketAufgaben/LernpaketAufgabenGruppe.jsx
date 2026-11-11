import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { istSchrittVollstaendig } from '@/lib/schrittTypen';
import NacharbeitZeichen from '@/components/workspace/kopf/NacharbeitZeichen';
import HinweisZeichen from '@/components/workspace/kopf/HinweisZeichen';
import { useElementHinweise } from '@/hooks/useElementHinweise';

/** Grün = vollständig, Orange = unvollständig – wie bei den übrigen Elementen des Menübaums. */
export function istVollstaendig(aufgabe) {
  if (aufgabe.content_status === 'approved' || aufgabe.is_complete === true) return true;
  const schritte = aufgabe.sequenz_schritte || [];
  return aufgabe.aufgaben_modus === 'sequenz' && schritte.length > 0 && schritte.every(istSchrittVollstaendig);
}

/** Die Aufgaben eines Lernpakets im Menübaum: Stift-Symbol, Aufgabe 1, Aufgabe 2, … (Titel als Tooltip). */
export default function LernpaketAufgabenGruppe({ aufgaben, lernpaket, selectedItem, onSelect }) {
  const hinweise = useElementHinweise(lernpaket.einheit_id);
  return (
    <TooltipProvider delayDuration={200}>
      {aufgaben.map((a, i) => {
        const gewaehlt = selectedItem?.type === 'aufgabe' && selectedItem.aufgabeId === a.id;
        return (
          <Tooltip key={a.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onSelect({ type: 'aufgabe', aufgabeId: a.id, lernpaket })}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs transition-colors',
                  gewaehlt ? 'bg-primary text-primary-foreground font-medium'
                    : cn('hover:bg-card', istVollstaendig(a) ? 'text-green-600' : 'text-orange-600')
                )}
              >
                <span className="shrink-0">✏️</span>
                <span className="flex-1 truncate">Aufgabe {i + 1}</span>
                {a.braucht_nacharbeit === true && <NacharbeitZeichen notiz={a.nacharbeit_notiz} gewaehlt={gewaehlt} />}
                <HinweisZeichen anzahl={hinweise([a.id]).length} gewaehlt={gewaehlt} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{a.titel?.trim() || 'Ohne Titel'}</TooltipContent>
          </Tooltip>
        );
      })}
    </TooltipProvider>
  );
}