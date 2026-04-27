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
import BundleErforderlichControl from '@/components/lernpfade/BundleErforderlichControl';
import BundleModusToggle from '@/components/lernpfade/BundleModusToggle';

// Phase 4: Nur das Aufgabenbündel zeigt das "X von Y"-Control. Lernpaket-
// und Projektbündel haben andere Semantik (alle Pflicht / freiwillig).
const AUFGABEN_BUENDEL_REF_ID = 'sys_platzhalter_brian_buendel';

export default function SystemBausteinPill({
  baustein,
  refId,
  sektorId,
  index,
  instanceId,
  isSelected,
  disabled,
  onSelect,
  onRemove,
  // Phase 4: nur am Aufgabenbündel relevant.
  bundleConfig,
  bundleChildCount = 0,
  onSetBundleConfig,
  // Phase C: Modus-Toggle an allen Bündel-Typen.
  onSetBundleModus,
}) {
  const Icon = getSystemBausteinIcon(baustein?.icon);
  const titel = baustein?.titel || refId;
  // Phase 3: Draggable-IDs müssen über Sektor- UND Bündel-Droppables hinweg
  // eindeutig sein. Wir nehmen die instance_id als stabilen Anker.
  const draggableId = `pfaditem-system-${instanceId || `${sektorId}-${index}-${refId}`}`;

  // Magic-Raster (Phase 1): Wenn der Baustein-Datensatz fehlt (z.B. weil er
  // erst geseedet werden muss), prüfen wir defensiv die ref_id selbst.
  const isPlatzhalter = isPlatzhalterBaustein(baustein) || isPlatzhalterBaustein(refId);

  // Bündel (baustein_modus='bundle_1ton') bekommt den dedizierten Indigo-Look
  // aus den Tailwind-Tokens (siehe Phase 1, Logbuch §18). Hat Vorrang vor dem
  // generischen Platzhalter-Style, weil ein Bündel zwar technisch ein
  // Platzhalter ist, aber visuell als Container erkennbar sein muss.
  const isBundle = baustein?.baustein_modus === 'bundle_1ton';

  // Nur am Aufgabenbündel zeigen wir den X-von-Y-Stepper (Phase 4).
  const isAufgabenBuendel = isBundle && refId === AUFGABEN_BUENDEL_REF_ID;

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
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  {isBundle && (
                    <BundleModusToggle
                      acceptedTypes={baustein?.accepted_types}
                      modus={bundleConfig?.modus}
                      disabled={disabled}
                      onChange={onSetBundleModus}
                    />
                  )}
                  {isAufgabenBuendel && (
                    <BundleErforderlichControl
                      childCount={bundleChildCount}
                      erforderlicheAnzahl={bundleConfig?.erforderliche_anzahl}
                      disabled={disabled}
                      onChange={onSetBundleConfig}
                    />
                  )}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove?.();
                      }}
                      title="Aus Pfad entfernen"
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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