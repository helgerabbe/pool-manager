import React from 'react';
import { X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function LernzielBadge({
  lernziel,
  onRemove,
  isRemoving = false,
}) {
  const handleRemoveClick = (e) => {
    e.stopPropagation();
    onRemove(lernziel.id);
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-between gap-2 p-2 rounded bg-white border border-green-200 hover:border-green-300 hover:bg-green-50 transition-all cursor-help">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {lernziel.formulierung_fachsprache}
              </p>
              {lernziel.kategorie && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {lernziel.kategorie}
                </p>
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRemoveClick}
                  disabled={isRemoving}
                  className={cn(
                    'shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors',
                    isRemoving ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                  aria-label="Verknüpfung aufheben"
                >
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Verknüpfung aufheben
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {lernziel.formulierung_fachsprache}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}