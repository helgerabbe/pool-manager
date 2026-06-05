/**
 * useDashboardDragAndDrop.js
 *
 * Kapselt die DnD-Logik des Lernpfad-Cockpits (Phase 3.4).
 *
 * Architektur:
 *   - Hält ein lokales `dragState` (`{ draggableId, source, validation }`),
 *     gespeist von onDragStart + onDragUpdate.
 *   - Stellt `getIsDropDisabled(droppableId)` bereit, das vom Architekt /
 *     Sektor / BundleContainer zur Render-Zeit pro Droppable abgefragt wird.
 *     → @hello-pangea/dnd unterstützt nur statisches `isDropDisabled` pro
 *       Droppable; durch State-Reaktivität bekommt der User trotzdem Live-
 *       Feedback (rote/keine Hover-Highlights je nach canDrop-Ergebnis).
 *   - onDragEnd validiert final, übersetzt lokale → absolute Indizes und
 *     ruft `updateKonfiguration` mit den Helfern aus `lernpfadeUtils`.
 *
 * Droppable-IDs:
 *   - 'pool'                       → Aufgaben-Pool (Quelle)
 *   - 'pool-system'                → System-Bausteine-Pool (Quelle)
 *   - 'sektor-<sektor_id>'         → Sektor-Root (Quelle + Ziel)
 *   - 'bundle-<bundle_instance_id>' → Bündel-Children (Quelle + Ziel)
 *
 * Draggable-IDs:
 *   - Pool-Aufgabe:        '<aufgabe_id>'
 *   - Pool-System:         'system-<baustein_id>'
 *   - Sektor/Bündel-Item:  'pfaditem-aufgabe-<instance_id>'
 *                          'pfaditem-system-<instance_id>'
 */

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ITEM_TYPE } from '@/lib/aufgabenTypen';
import {
  canDrop,
  insertItemInSektorAtAbsolute,
  moveItemAbsolute,
  resolveAbsoluteInsertIndex,
  normalizeItem,
} from '@/lib/lernpfadeUtils';

const SYSTEM_DRAG_PREFIX = 'system-';
const PFAD_AUFGABE_PREFIX = 'pfaditem-aufgabe-';
const PFAD_SYSTEM_PREFIX = 'pfaditem-system-';

/**
 * Parst eine droppableId in `{ kind, id }`. Liefert null für unbekannte IDs.
 */
function parseDroppableId(droppableId) {
  if (!droppableId) return null;
  if (droppableId === 'pool') return { kind: 'pool' };
  if (droppableId === 'pool-system') return { kind: 'pool-system' };
  if (droppableId.startsWith('sektor-')) {
    return { kind: 'sektor', id: droppableId.slice('sektor-'.length) };
  }
  if (droppableId.startsWith('bundle-')) {
    return { kind: 'bundle', id: droppableId.slice('bundle-'.length) };
  }
  return null;
}

/**
 * Findet das Item im Sektor anhand der instance_id. Liefert
 * { sektorId, absoluteIndex, item } oder null.
 */
function findItemByInstanceId(konfiguration, lernTyp, instanceId) {
  const sektoren = konfiguration?.[lernTyp] || [];
  for (const s of sektoren) {
    const items = s.items || [];
    const idx = items.findIndex((it) => it?.instance_id === instanceId);
    if (idx !== -1) {
      return { sektorId: s.sektor_id, absoluteIndex: idx, item: items[idx] };
    }
  }
  return null;
}

/**
 * Findet einen Sektor anhand einer Bündel-instance_id (für Bündel-Drops, deren
 * Ziel-Droppable nur die Bündel-ID kennt, aber nicht den Container-Sektor).
 */
function findSektorIdForBundle(konfiguration, lernTyp, bundleInstanceId) {
  const sektoren = konfiguration?.[lernTyp] || [];
  for (const s of sektoren) {
    if ((s.items || []).some((it) => it?.instance_id === bundleInstanceId)) {
      return s.sektor_id;
    }
  }
  return null;
}

/**
 * Erzeugt einen pseudo-DraggedItem-Deskriptor für den canDrop-Validator,
 * abgeleitet aus draggableId + Quell-Droppable.
 */
function describeDraggedItem({ draggableId, sourceDroppableId, konfiguration, lernTyp }) {
  if (!draggableId) return null;

  // Pool-System: 'system-<baustein_id>'
  if (sourceDroppableId === 'pool-system' && draggableId.startsWith(SYSTEM_DRAG_PREFIX)) {
    return {
      type: ITEM_TYPE.SYSTEM,
      ref_id: draggableId.slice(SYSTEM_DRAG_PREFIX.length),
      isFromPool: true,
    };
  }

  // Pool-Aufgabe: '<aufgabe_id>'
  if (sourceDroppableId === 'pool') {
    return {
      type: ITEM_TYPE.AUFGABE,
      ref_id: draggableId,
      isFromPool: true,
    };
  }

  // Existierendes Sektor-/Bündel-Item: '<prefix><instance_id>'
  let instanceId = null;
  if (draggableId.startsWith(PFAD_AUFGABE_PREFIX)) {
    instanceId = draggableId.slice(PFAD_AUFGABE_PREFIX.length);
  } else if (draggableId.startsWith(PFAD_SYSTEM_PREFIX)) {
    instanceId = draggableId.slice(PFAD_SYSTEM_PREFIX.length);
  }
  if (!instanceId) return null;

  const found = findItemByInstanceId(konfiguration, lernTyp, instanceId);
  if (!found) return null;
  return { ...found.item, isFromPool: false };
}

export function useDashboardDragAndDrop({
  activeLernTyp,
  readOnly,
  konfiguration,
  systemBausteineById,
  aufgabenById,
  updateKonfiguration,
}) {
  // dragState ist NUR während eines aktiven Drags belegt.
  // validationByTarget: Map<droppableId, canDropResult> – pro Hover-Target,
  // gefüllt durch onDragUpdate.
  const [dragState, setDragState] = useState(null);

  const handleDragStart = useCallback(
    (start) => {
      if (readOnly) return;
      const dragged = describeDraggedItem({
        draggableId: start.draggableId,
        sourceDroppableId: start.source?.droppableId,
        konfiguration,
        lernTyp: activeLernTyp,
      });
      setDragState({
        draggableId: start.draggableId,
        source: start.source,
        draggedItem: dragged,
        currentTarget: null,
        currentValidation: null,
      });
    },
    [readOnly, konfiguration, activeLernTyp]
  );

  const handleDragUpdate = useCallback(
    (update) => {
      setDragState((prev) => {
        if (!prev) return prev;
        const dst = update.destination;
        if (!dst) return { ...prev, currentTarget: null, currentValidation: null };

        const parsed = parseDroppableId(dst.droppableId);
        if (!parsed) return { ...prev, currentTarget: dst.droppableId, currentValidation: null };

        // Pool-Drops sind immer "ok" (= keine Aktion, wird in onDragEnd verworfen).
        if (parsed.kind === 'pool' || parsed.kind === 'pool-system') {
          return { ...prev, currentTarget: dst.droppableId, currentValidation: { ok: true } };
        }

        const targetParentRefId = parsed.kind === 'bundle'
          ? // Für canDrop brauchen wir die ref_id des Bündels, nicht die instance_id.
            (() => {
              const sektoren = konfiguration?.[activeLernTyp] || [];
              for (const s of sektoren) {
                const it = (s.items || []).find((x) => x?.instance_id === parsed.id);
                if (it) return it.ref_id;
              }
              return null;
            })()
          : null;

        const validation = canDrop({
          draggedItem: prev.draggedItem,
          lernTyp: activeLernTyp,
          konfiguration,
          targetParentRefId,
          systemBausteineById,
          aufgabenById,
        });
        return { ...prev, currentTarget: dst.droppableId, currentValidation: validation };
      });
    },
    [activeLernTyp, konfiguration, systemBausteineById, aufgabenById]
  );

  const handleDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      // dragState in jedem Fall zurücksetzen, BEVOR wir früh raus springen.
      setDragState(null);
      if (!destination) return;
      if (readOnly) return;

      const src = parseDroppableId(source.droppableId);
      const dst = parseDroppableId(destination.droppableId);
      if (!src || !dst) return;

      // Drop zurück in einen Pool → keine Aktion.
      if (dst.kind === 'pool' || dst.kind === 'pool-system') return;

      const dragged = describeDraggedItem({
        draggableId,
        sourceDroppableId: source.droppableId,
        konfiguration,
        lernTyp: activeLernTyp,
      });
      if (!dragged) return;

      // Ziel-Bündel-ref_id für Validator (wenn Drop in ein Bündel geht).
      const sektoren = konfiguration?.[activeLernTyp] || [];
      let targetSektorId = null;
      let targetParentInstanceId = null;
      let targetParentRefId = null;

      if (dst.kind === 'sektor') {
        targetSektorId = dst.id;
      } else if (dst.kind === 'bundle') {
        targetParentInstanceId = dst.id;
        targetSektorId = findSektorIdForBundle(konfiguration, activeLernTyp, dst.id);
        for (const s of sektoren) {
          const it = (s.items || []).find((x) => x?.instance_id === dst.id);
          if (it) {
            targetParentRefId = it.ref_id;
            break;
          }
        }
        if (!targetSektorId) return;
      }

      // ── Nested-Droppable-Korrektur ───────────────────────────────────────
      // @hello-pangea/dnd unterstützt offiziell KEINE verschachtelten
      // Droppables (Bündel-Droppable liegt im Sektor-Droppable). Beim
      // Umsortieren eines Bündel-Kindes – v. a. nach oben – meldet die Engine
      // gelegentlich den umgebenden Sektor als Ziel statt das Bündel. Das Kind
      // "fliegt" dann aus dem Bündel heraus. Wenn das gezogene Element aus
      // einem Bündel stammt und direkt am Bündel (davor/danach) im SELBEN
      // Sektor losgelassen wird, halten wir es im Bündel und sortieren es an
      // den Anfang bzw. das Ende. Wird es klar woanders (zwischen anderen
      // Root-Items) abgelegt, bleibt das Herausziehen erlaubt.
      let rerouteLocalChildIndex = null;
      if (
        src.kind === 'bundle' &&
        dst.kind === 'sektor' &&
        !dragged.isFromPool &&
        dragged.parent_instance_id
      ) {
        const srcFound = findItemByInstanceId(konfiguration, activeLernTyp, dragged.instance_id);
        if (srcFound && srcFound.sektorId === dst.id) {
          const sektorObj = sektoren.find((s) => s.sektor_id === srcFound.sektorId);
          const itemsArr = sektorObj?.items || [];
          const bundleAbsIdx = itemsArr.findIndex(
            (it) => it?.instance_id === dragged.parent_instance_id
          );
          if (bundleAbsIdx !== -1) {
            const rootIdxOfBundle = itemsArr
              .slice(0, bundleAbsIdx)
              .filter((it) => !it?.parent_instance_id).length;
            const dropRootIdx = destination.index;
            if (dropRootIdx <= rootIdxOfBundle + 1) {
              targetParentInstanceId = dragged.parent_instance_id;
              targetSektorId = srcFound.sektorId;
              targetParentRefId = itemsArr[bundleAbsIdx]?.ref_id || null;
              // Vor dem Bündel-Header losgelassen → an den Anfang; sonst ans Ende.
              rerouteLocalChildIndex = dropRootIdx <= rootIdxOfBundle ? 0 : Number.MAX_SAFE_INTEGER;
            }
          }
        }
      }

      // Finale Strict-Drop-Validierung (defense-in-depth, falls onDragUpdate
      // nicht gefeuert hat oder Daten zwischenzeitlich gewandert sind).
      const validation = canDrop({
        draggedItem: dragged,
        lernTyp: activeLernTyp,
        konfiguration,
        targetParentRefId,
        systemBausteineById,
        aufgabenById,
      });
      if (!validation.ok) {
        if (validation.reason === 'duplicate_in_lerntyp') {
          toast.error('Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.');
        } else if (validation.reason === 'bundle_in_bundle') {
          toast.error('Bündel können nicht in andere Bündel gezogen werden.');
        } else if (validation.reason === 'wrong_type') {
          toast.error('Dieser Aufgabentyp passt nicht in dieses Bündel.');
        }
        return;
      }

      // ── Pool → Sektor/Bündel ──
      if (src.kind === 'pool' || src.kind === 'pool-system') {
        const targetSektor = sektoren.find((s) => s.sektor_id === targetSektorId);
        if (!targetSektor) return;
        const absoluteIndex = resolveAbsoluteInsertIndex(
          targetSektor.items || [],
          targetParentInstanceId,
          destination.index
        );
        const newItem = normalizeItem({
          type: dragged.type,
          ref_id: dragged.ref_id,
          parent_instance_id: targetParentInstanceId ?? null,
        });
        updateKonfiguration((prev) =>
          insertItemInSektorAtAbsolute(prev, activeLernTyp, targetSektorId, newItem, absoluteIndex)
        );
        return;
      }

      // ── Sektor/Bündel → Sektor/Bündel ──
      if (src.kind === 'sektor' || src.kind === 'bundle') {
        // Quell-Item finden (über instance_id aus draggableId).
        let instanceId = null;
        if (draggableId.startsWith(PFAD_AUFGABE_PREFIX)) {
          instanceId = draggableId.slice(PFAD_AUFGABE_PREFIX.length);
        } else if (draggableId.startsWith(PFAD_SYSTEM_PREFIX)) {
          instanceId = draggableId.slice(PFAD_SYSTEM_PREFIX.length);
        }
        if (!instanceId) return;

        const found = findItemByInstanceId(konfiguration, activeLernTyp, instanceId);
        if (!found) return;
        const fromSektorId = found.sektorId;
        const fromAbsoluteIndex = found.absoluteIndex;

        // Bei Move im selben Sektor: Index NACH dem Entfernen des Items neu auflösen.
        const targetSektor = sektoren.find((s) => s.sektor_id === targetSektorId);
        if (!targetSektor) return;
        const baseItems = targetSektor.items || [];
        const itemsForResolve =
          fromSektorId === targetSektorId
            ? baseItems.filter((_, i) => i !== fromAbsoluteIndex)
            : baseItems;
        const localTargetIndex =
          rerouteLocalChildIndex != null ? rerouteLocalChildIndex : destination.index;
        const absoluteToIndex = resolveAbsoluteInsertIndex(
          itemsForResolve,
          targetParentInstanceId,
          localTargetIndex
        );

        // No-op? (gleicher Sektor, gleicher Parent, gleiche Position)
        if (
          fromSektorId === targetSektorId &&
          (found.item.parent_instance_id ?? null) === (targetParentInstanceId ?? null) &&
          fromAbsoluteIndex === absoluteToIndex
        ) {
          return;
        }

        updateKonfiguration((prev) =>
          moveItemAbsolute(
            prev,
            activeLernTyp,
            fromSektorId,
            fromAbsoluteIndex,
            targetSektorId,
            absoluteToIndex,
            targetParentInstanceId
          )
        );
        return;
      }
    },
    [
      readOnly,
      activeLernTyp,
      konfiguration,
      systemBausteineById,
      aufgabenById,
      updateKonfiguration,
    ]
  );

  /**
   * Pro Droppable abgefragt während eines aktiven Drags.
   * - Während kein Drag läuft → false (alle Droppables aktiv).
   * - Während ein Drag läuft → true für alle Bündel-/Sektor-Targets, in die
   *   das aktuelle Item NICHT abgelegt werden darf. Pool-Targets sind nie
   *   disabled (sie nehmen den Drop entgegen, der dann in onDragEnd verworfen
   *   wird – Standardverhalten von @hello-pangea/dnd).
   *
   * Wichtig: Wir berechnen `canDrop` PRO ABFRAGE, weil jeder Droppable seinen
   * eigenen Kontext (Sektor-Root vs. Bündel-Container) hat. Das ist günstig,
   * da der Validator reine Map-Lookups macht.
   */
  const getIsDropDisabled = useCallback(
    (droppableId) => {
      if (!dragState || !dragState.draggedItem) return false;
      const parsed = parseDroppableId(droppableId);
      if (!parsed) return false;
      if (parsed.kind === 'pool' || parsed.kind === 'pool-system') return false;
      // Sektor-Root → keine parent-ref → nur Duplikat-/wrong_type-Edges greifen.
      // Bündel → braucht die ref_id des Bündels.
      let targetParentRefId = null;
      if (parsed.kind === 'bundle') {
        const sektoren = konfiguration?.[activeLernTyp] || [];
        for (const s of sektoren) {
          const it = (s.items || []).find((x) => x?.instance_id === parsed.id);
          if (it) {
            targetParentRefId = it.ref_id;
            break;
          }
        }
        if (!targetParentRefId) return true; // Bündel nicht (mehr) auffindbar → safe disable.
      }
      const validation = canDrop({
        draggedItem: dragState.draggedItem,
        lernTyp: activeLernTyp,
        konfiguration,
        targetParentRefId,
        systemBausteineById,
        aufgabenById,
      });
      return !validation.ok;
    },
    [dragState, activeLernTyp, konfiguration, systemBausteineById, aufgabenById]
  );

  return useMemo(
    () => ({ handleDragStart, handleDragUpdate, handleDragEnd, getIsDropDisabled, dragState }),
    [handleDragStart, handleDragUpdate, handleDragEnd, getIsDropDisabled, dragState]
  );
}