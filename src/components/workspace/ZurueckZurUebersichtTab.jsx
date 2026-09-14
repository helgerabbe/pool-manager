import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { istUebungsblock } from '@/lib/einheitFormat';

/**
 * Rücksprung-Reiter links neben Reiter 1.
 *
 * Ohne ihn führt der Weg aus einer Einheit heraus nur über die Startseite —
 * bei Übungsblöcken zurück in ihre Unterrichtseinheit (Fach-Seite), sonst
 * in die Einheiten-Übersicht.
 */
export default function ZurueckZurUebersichtTab({ einheit }) {
  const ziel = istUebungsblock(einheit) && einheit?.fach
    ? `/unterricht?fach=${encodeURIComponent(einheit.fach)}&jg=${encodeURIComponent(einheit.jahrgangsstufe || '')}`
    : '/einheiten';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={ziel}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card text-muted-foreground hover:border-primary/50 hover:bg-muted/50 transition-all font-medium shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs font-medium">
          Zurück zur Übersicht
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}