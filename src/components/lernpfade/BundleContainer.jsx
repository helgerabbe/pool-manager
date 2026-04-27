/**
 * BundleContainer.jsx
 *
 * Hierarchischer Container für Bündel-Bausteine (baustein_modus='bundle_1ton').
 *
 * Phase 2: reines Read-Rendering der Children (siehe Logbuch §18).
 * Phase 3 (Schritt 3.2): eigenes <Droppable> für Children.
 *
 * Architektur:
 *   - droppableId = `bundle-${instance_id}` (eindeutig, kein Konflikt mit Sektor-IDs).
 *   - type        = 'LERNPFAD_ITEM' (identisch zum Sektor-Droppable, damit
 *                                    Pool-Drags BEIDE Targets bedienen können —
 *                                    siehe Architektur-Entscheidung Phase 3).
 *   - Strict-Drop-Logik (was darf rein? Bündel-in-Bündel?) wird in Schritt 3.4
 *     über `isDropDisabled` von außen gesteuert — gespeist aus dem `canDrop`-
 *     Validator in `onDragStart`/`onDragUpdate`.
 *
 * Optik:
 *   - Token-Familie `bundle` aus tailwind.config.js (Phase 1).
 *   - bg-bundle-soft + border-bundle-border + Akzent-Linie `border-bundle`.
 *   - Drop-Hover: leichter Indigo-Wash, damit der User sieht, dass die
 *     Children-Zone aktiv ist (analog zum Sektor-Droppable-Hover).
 */

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import BundleAutoFillButton from '@/components/lernpfade/BundleAutoFillButton';

export default function BundleContainer({
  bundleInstanceId,
  headerSlot,
  children,
  isEmpty,
  isDropDisabled = false,
  onAutoFill,
  autoFillDisabled = false,
}) {
  return (
    <div
      data-bundle-container="true"
      className="rounded-md border border-bundle-border bg-bundle-soft/60 p-1.5 space-y-1.5"
    >
      {/* Header = das Bündel-Pill selbst (von außen reingereicht). */}
      {headerSlot}

      {/* Children-Spur: dezenter Akzent links, leichte Einrückung,
          eigenes Droppable für Strict-Drop. */}
      <Droppable
        droppableId={`bundle-${bundleInstanceId}`}
        type="LERNPFAD_ITEM"
        isDropDisabled={isDropDisabled}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`ml-4 border-l-2 pl-3 py-0.5 space-y-1.5 rounded-r-sm transition-colors ${
              snapshot.isDraggingOver
                ? 'border-bundle bg-bundle/10'
                : 'border-bundle/60'
            }`}
          >
            {isEmpty && !snapshot.isDraggingOver ? (
              <div className="space-y-1">
                <div className="text-[10px] italic text-muted-foreground/70 py-0.5">
                  Bündel ist leer – passende Aufgaben hierher ziehen.
                </div>
                {onAutoFill && (
                  <BundleAutoFillButton
                    onAutoFill={onAutoFill}
                    disabled={autoFillDisabled}
                  />
                )}
              </div>
            ) : (
              children
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}