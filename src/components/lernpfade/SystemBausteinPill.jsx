/**
 * SystemBausteinPill.jsx
 *
 * Pill-Darstellung eines System-Bausteins innerhalb eines Sektors (rechte
 * Canvas-Spalte). Eigene Komponente, weil sie:
 *   - keinen Status anzeigt,
 *   - eine eindeutig graue Optik hat (klar getrennt von Aufgaben),
 *   - eine andere draggableId-Konvention nutzt (sektoritem-System...),
 *   - bei Auswahl den System-Monitor öffnet.
 *
 * Für jedes Sektor-Item wird ein lokaler, sektor-eindeutiger draggableId
 * benötigt (System-Bausteine dürfen mehrfach im gleichen Lernpfad existieren).
 * Wir kombinieren deshalb sektor_id + index + ref_id.
 */

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GripVertical, X } from 'lucide-react';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { isPlatzhalterBaustein, PLATZHALTER_CLASSES } from '@/lib/platzhalterUtils';

export default function SystemBausteinPill({
  baustein,
  refId,
  sektorId,
  index,
  isSelected,
  disabled,
  onSelect,
  onRemove,
}) {
  const Icon = getSystemBausteinIcon(baustein?.icon);
  const titel = baustein?.titel || refId;
  const draggableId = `pfaditem-system-${sektorId}-${index}-${refId}`;

  // Magic-Raster (Phase 1): Wenn der Baustein-Datensatz fehlt (z.B. weil er
  // erst geseedet werden muss), prüfen wir defensiv die ref_id selbst.
  const isPlatzhalter = isPlatzhalterBaustein(baustein) || isPlatzhalterBaustein(refId);

  // Bündel (baustein_modus='bundle_1ton') bekommt den dedizierten Indigo-Look
  // aus den Tailwind-Tokens (siehe Phase 1, Logbuch §18). Hat Vorrang vor dem
  // generischen Platzhalter-Style, weil ein Bündel zwar technisch ein
  // Platzhalter ist, aber visuell als Container erkennbar sein muss.
  const isBundle = baustein?.baustein_modus === 'bundle_1ton';

  let containerClasses;
  if (isBundle) {
    containerClasses = isSelected
      ? 'border-bundle bg-bundle-soft shadow-sm'
      : 'border-bundle-border bg-bundle-soft hover:border-bundle';
  } else if (isPlatzhalter) {
    containerClasses = isSelected
      ? PLATZHALTER_CLASSES.containerSelected
      : PLATZHALTER_CLASSES.container;
  } else {
    containerClasses = isSelected
      ? 'border-slate-400 bg-slate-100 shadow-sm'
      : 'border-slate-200 bg-slate-50 hover:border-slate-300';
  }

  return (
    <Draggable draggableId={draggableId} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                onClick={() => onSelect?.(refId)}
                data-platzhalter={isPlatzhalter ? 'true' : 'false'}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${containerClasses} ${
                  snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-400 bg-white' : ''
                }`}
              >
                <GripVertical className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                    isBundle
                      ? 'bg-bundle text-bundle-foreground'
                      : isPlatzhalter
                      ? PLATZHALTER_CLASSES.iconBox
                      : 'bg-slate-200'
                  }`}
                >
                  <Icon
                    strokeWidth={2.5}
                    className={`w-3 h-3 ${
                      isBundle
                        ? 'text-bundle-foreground'
                        : isPlatzhalter
                        ? PLATZHALTER_CLASSES.icon
                        : 'text-slate-700'
                    }`}
                  />
                </div>
                <span
                  className={`flex-1 min-w-0 truncate font-medium ${
                    isBundle
                      ? 'text-bundle'
                      : isPlatzhalter
                      ? PLATZHALTER_CLASSES.title
                      : 'text-slate-800'
                  }`}
                >
                  {titel}
                  {!baustein && (
                    <span className="ml-1 italic text-muted-foreground">(unbekannt)</span>
                  )}
                </span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove?.(index);
                    }}
                    title="Aus Pfad entfernen"
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </TooltipTrigger>
            {baustein?.admin_beschreibung && (
              <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                {baustein.admin_beschreibung}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </Draggable>
  );
}