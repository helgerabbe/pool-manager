/**
 * useDashboardDragAndDrop.js
 *
 * Kapselt die `onDragEnd`-Logik des Lernpfad-Cockpits.
 *
 * Quellen → Ziele:
 *   - 'pool'         (Aufgaben-Pool)        → 'sektor-<id>'  : Aufgabe einfügen (Anti-Duplikat)
 *   - 'pool-system'  (System-Bausteine)     → 'sektor-<id>'  : Baustein einfügen (Mehrfach erlaubt)
 *   - 'sektor-<id>'                          → 'sektor-<id>'  : Reorder/Move
 *   - Drop zurück in den Pool → keine Aktion (Items entfernt man via X-Button)
 *
 * Der Hook ändert Daten ausschließlich über das übergebene `updateKonfiguration`,
 * das aus dem Cockpit kommt und intern einen scheduleSave triggert.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  insertAufgabeInSektor,
  insertSystemBausteinInSektor,
  moveAufgabe,
} from '@/lib/lernpfadeUtils';

const SYSTEM_DRAG_PREFIX = 'system-';

export function useDashboardDragAndDrop({
  activeLernTyp,
  readOnly,
  usedAufgabenIds,
  updateKonfiguration,
}) {
  const handleDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (readOnly) return;

      const srcId = source.droppableId;
      const dstId = destination.droppableId;

      // Drop zurück in einen Pool → keine Aktion.
      if (dstId === 'pool' || dstId === 'pool-system') return;

      // ── Pool → Sektor ──
      if ((srcId === 'pool' || srcId === 'pool-system') && dstId.startsWith('sektor-')) {
        const sektorId = dstId.replace('sektor-', '');

        // System-Baustein: kein Duplikat-Check, kein Limit.
        if (srcId === 'pool-system' && draggableId.startsWith(SYSTEM_DRAG_PREFIX)) {
          const bausteinId = draggableId.slice(SYSTEM_DRAG_PREFIX.length);
          updateKonfiguration((prev) =>
            insertSystemBausteinInSektor(prev, activeLernTyp, sektorId, bausteinId, destination.index)
          );
          return;
        }

        // Reguläre Aufgabe: Anti-Duplikat (Sicherheits-Check zur visuellen Drag-Sperre).
        if (srcId === 'pool') {
          if (usedAufgabenIds.has(draggableId)) {
            toast.error('Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.');
            return;
          }
          updateKonfiguration((prev) =>
            insertAufgabeInSektor(prev, activeLernTyp, sektorId, draggableId, destination.index)
          );
          return;
        }
      }

      // ── Sektor → Sektor (oder gleicher Sektor = Reorder) ──
      // Funktioniert für Aufgaben- UND System-Items gleichermaßen, weil moveAufgabe
      // rein index-basiert das gesamte Item (inkl. type) verschiebt.
      if (srcId.startsWith('sektor-') && dstId.startsWith('sektor-')) {
        const fromSektorId = srcId.replace('sektor-', '');
        const toSektorId = dstId.replace('sektor-', '');
        if (fromSektorId === toSektorId && source.index === destination.index) return;
        updateKonfiguration((prev) =>
          moveAufgabe(prev, activeLernTyp, fromSektorId, source.index, toSektorId, destination.index)
        );
        return;
      }
    },
    [readOnly, activeLernTyp, usedAufgabenIds, updateKonfiguration]
  );

  return { handleDragEnd };
}