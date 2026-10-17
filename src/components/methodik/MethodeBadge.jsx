import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/** Methoden-Plakette mit Kurzbeschreibung aus dem Methodenkatalog beim Drauffahren. */
export default function MethodeBadge({ name }) {
  const { data } = useQuery({
    queryKey: ['methode-kurz', name],
    queryFn: () => base44.entities.MethodenKatalog.filter({ name }, { limit: 1, fields: ['kurzbeschreibung'] }).then((p) => p.items[0]?.kurzbeschreibung || ''),
    staleTime: Infinity,
  });
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{name} <Info className="h-3 w-3" /></span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{data || 'Zu dieser Methode gibt es noch keine Kurzbeschreibung. Frag gern den Assistenten.'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}