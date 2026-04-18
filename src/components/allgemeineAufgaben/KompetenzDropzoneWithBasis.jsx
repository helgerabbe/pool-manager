import React, { useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropzone die sowohl reguläre Lernziele als auch BasisLernziele zeigt
 * BasisLernziele sind visuell mit einem "Vorwissen"-Badge gekennzeichnet
 */
export default function KompetenzDropzoneWithBasis({
  aufgabeId,
  mappedLernziele,
  mappedBasisLernziele,
  onMappingRemoved,
  onBasisMappingRemoved,
  removingIds = new Set(),
  removingBasisIds = new Set(),
  kannBearbeiten = false,
}) {
  const totalCount = mappedLernziele.length + mappedBasisLernziele.length;

  return (
    <Droppable droppableId={`dropzone-${aufgabeId}`}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-4 rounded-lg border-2 transition-all ${
            snapshot.isDraggingOver
              ? 'border-primary/60 bg-primary/5'
              : 'border-dashed border-muted-foreground/30 bg-muted/20'
          } min-h-32 flex flex-col gap-3`}
        >
          <p className="text-xs text-muted-foreground font-medium">
            {totalCount === 0
              ? 'Kompetenzen und Basis-Vorwissen hier ablegen'
              : `${totalCount} Kompetenz(en) zugeordnet`}
          </p>

          {/* Reguläre Lernziele */}
          {mappedLernziele.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-foreground/60 uppercase">Lernziele</p>
              <div className="space-y-1.5">
                {mappedLernziele.map((lz) => (
                  <div
                    key={lz.id}
                    className={cn(
                      'flex items-start justify-between gap-2 p-2 rounded border border-green-200 bg-white hover:border-green-300 hover:bg-green-50 transition-all',
                      removingIds.has(lz.id) && 'opacity-50'
                    )}
                  >
                    <p className="text-xs font-medium text-foreground flex-1 line-clamp-2">
                      {lz.formulierung_fachsprache}
                    </p>
                    {kannBearbeiten && (
                      <button
                        onClick={() => onMappingRemoved(lz.id)}
                        disabled={removingIds.has(lz.id)}
                        className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basis-Lernziele */}
          {mappedBasisLernziele.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-foreground/60 uppercase">Basis-Vorwissen</p>
              <div className="space-y-1.5">
                {mappedBasisLernziele.map((lz) => (
                  <div
                    key={lz.id}
                    className={cn(
                      'flex items-start justify-between gap-2 p-2 rounded border border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 transition-all',
                      removingBasisIds.has(lz.id) && 'opacity-50'
                    )}
                  >
                    <div className="flex-1 flex flex-col gap-0.5">
                      <p className="text-xs font-medium text-foreground line-clamp-2">
                        {lz.text}
                      </p>
                      <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0">
                        Vorwissen
                      </Badge>
                    </div>
                    {kannBearbeiten && (
                      <button
                        onClick={() => onBasisMappingRemoved(lz.id)}
                        disabled={removingBasisIds.has(lz.id)}
                        className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}