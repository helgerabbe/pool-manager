/**
 * SystemBausteinPoolItem.jsx
 *
 * Karte eines System-Bausteins im Pool (linke Spalte, Tab "Standard-Elemente").
 * - Visuell deutlich anders als reguläre Aufgaben: grauer Hintergrund, fettes
 *   Icon, KEIN Status-Badge, KEIN „Im Pfad"-Hinweis.
 * - Darf unendlich oft gezogen werden → kein isDragDisabled.
 * - Tooltip zeigt admin_beschreibung.
 */

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import { isPlatzhalterBaustein, PLATZHALTER_CLASSES } from '@/lib/platzhalterUtils';
import { getBundleFarbe } from '@/lib/lernpfadFarben';

export default function SystemBausteinPoolItem({
  baustein,
  index,
  isSelected,
  onClick,
}) {
  const Icon = getSystemBausteinIcon(baustein.icon);
  const draggableId = `system-${baustein.baustein_id}`;

  // Magic-Raster (Phase 1): Platzhalter werden als gestrichelte Drop-Zonen
  // dargestellt, um den Aufforderungscharakter ("hier muss noch was rein")
  // klar von regulären System-Bausteinen abzugrenzen.
  const isPlatzhalter = isPlatzhalterBaustein(baustein);

  // Bündel (baustein_modus='bundle_1ton') tragen die Farbe ihres INHALTS —
  // blau = Lernpakete, orange = Aufgaben, lila = Projekte (zentral:
  // lernpfadFarben.js, identisch zur Sektor-Pill). Vorrang vor dem
  // Platzhalter-Style, weil Bündel optisch als Container erkennbar bleiben.
  const isBundle = baustein?.baustein_modus === 'bundle_1ton';
  const bundleFarbe = isBundle ? getBundleFarbe(baustein?.accepted_types) : null;

  let containerClasses;
  if (isBundle) {
    containerClasses = isSelected
      ? `border-dashed border-2 ${bundleFarbe.border} ${bundleFarbe.bg} shadow-sm`
      : `border-dashed border-2 ${bundleFarbe.border} ${bundleFarbe.bg} ${bundleFarbe.hoverBorder}`;
  } else if (isPlatzhalter) {
    containerClasses = isSelected
      ? PLATZHALTER_CLASSES.containerSelected
      : PLATZHALTER_CLASSES.container;
  } else {
    containerClasses = isSelected
      ? 'border-slate-400 bg-slate-100 shadow-sm'
      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300';
  }

  return (
    <Draggable draggableId={draggableId} index={index}>
      {(provided, snapshot) => (
        <TooltipProvider delayDuration={400}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                onClick={onClick}
                data-platzhalter={isPlatzhalter ? 'true' : 'false'}
                className={`w-full text-left rounded-lg py-1.5 px-2 border transition-all flex items-center gap-2 cursor-grab active:cursor-grabbing ${containerClasses} ${
                  snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-400 bg-white' : ''
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                    isBundle
                      ? bundleFarbe.iconBg
                      : isPlatzhalter
                      ? PLATZHALTER_CLASSES.iconBox
                      : 'bg-slate-200'
                  }`}
                >
                  <Icon
                    strokeWidth={2.5}
                    className={`w-3 h-3 ${
                      isBundle
                        ? bundleFarbe.iconText
                        : isPlatzhalter
                        ? PLATZHALTER_CLASSES.icon
                        : 'text-slate-700'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-semibold truncate leading-snug ${
                      isBundle
                        ? bundleFarbe.text
                        : isPlatzhalter
                        ? PLATZHALTER_CLASSES.title
                        : 'text-slate-800'
                    }`}
                  >
                    {baustein.titel}
                  </p>
                </div>
              </div>
            </TooltipTrigger>
            {baustein.admin_beschreibung && (
              <TooltipContent side="right" className="max-w-xs text-xs leading-relaxed">
                {baustein.admin_beschreibung}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </Draggable>
  );
}