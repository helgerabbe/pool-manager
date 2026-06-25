import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Info, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function AktivitaetInfoDialog({ open, onOpenChange, katalogEntry }) {
  if (!katalogEntry) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            {katalogEntry.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Was ist das?</p>
            {katalogEntry.beschreibung ? (
              <p className="text-sm text-foreground leading-relaxed">{katalogEntry.beschreibung}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Noch keine Beschreibung hinterlegt.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Vorschau (Schüleransicht)
            </p>
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Eye className="w-6 h-6 opacity-20" />
              <p className="text-xs text-center">Vorschau folgt in einer späteren Version.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Ein einzelner Aktivitäts-Chip in der Palette.
 * Draggable (Kopier-Semantik: bleibt in Palette nach Drop).
 */
export default function AktivitaetPaletteChip({ katalogEntry, index }) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <Draggable draggableId={`palette-${katalogEntry.id}`} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`
              relative flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-xs font-medium cursor-grab select-none
              transition-all duration-150
              ${snapshot.isDragging
                ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105 z-50'
                : 'bg-white border-border text-foreground hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm'
              }
            `}
          >
            <span className="flex-1 leading-tight truncate">{katalogEntry.name}</span>
            {/* Info-Button: stoppt Drag-Propagierung */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setInfoOpen(true);
              }}
              className={`shrink-0 p-0.5 rounded transition-colors ${snapshot.isDragging ? 'text-primary-foreground/70 hover:text-primary-foreground' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
              title="Informationen zu dieser Aktivität"
            >
              <Info className="w-3 h-3" />
            </button>
          </div>
        )}
      </Draggable>

      <AktivitaetInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        katalogEntry={katalogEntry}
      />
    </>
  );
}