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
  normalizeItem,
  getUsedAufgabenIds,
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

/**
 * Ist das Item ein Bündel-Header (System-Baustein mit baustein_modus='bundle_1ton')?
 */
function isBundleHeader(item, isBundleRef) {
  return item?.type === ITEM_TYPE.SYSTEM && !!isBundleRef?.(item.ref_id);
}

/**
 * Flaches Datenmodell (single Droppable pro Sektor): Die Bündel-Zugehörigkeit
 * eines an `insertIndex` eingefügten Items wird aus dem VORGÄNGER abgeleitet.
 *   - Vorgänger ist ein Bündel-Header  → Item wird Kind dieses Bündels.
 *   - Vorgänger ist selbst ein Kind    → Item tritt demselben Bündel bei.
 *   - sonst (Root oder Position 0)     → Item ist Root (parent=null).
 * So kann innerhalb eines Bündels punktgenau sortiert UND ein Element durch
 * Ablage zwischen Root-Items wieder herausgezogen werden.
 */
function inferParentInstanceId(items, insertIndex, isBundleRef) {
  if (insertIndex <= 0) return null;
  const prev = items[insertIndex - 1];
  if (!prev) return null;
  if (isBundleHeader(prev, isBundleRef)) return prev.instance_id;
  return prev.parent_instance_id || null;
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
      // Es gibt nur noch EINEN Droppable pro Sektor (keine verschachtelten
      // Bündel-Droppables mehr). Bündel-Zugehörigkeit wird über die Ablage-
      // Position abgeleitet (inferParentInstanceId). Pool-Ziele werden
      // verworfen, Bündel-Ziele existieren nicht mehr als Droppable.
      if (dst.kind !== 'sektor') return;
      const toSektorId = dst.id;

      const dragged = describeDraggedItem({
        draggableId,
        sourceDroppableId: source.droppableId,
        konfiguration,
        lernTyp: activeLernTyp,
      });
      if (!dragged) return;

      const isBundleRef = (refId) =>
        systemBausteineById?.get?.(refId)?.baustein_modus === 'bundle_1ton';

      // Finalen Parent bestimmen + Bündel-Aufnahme validieren. Ungültige
      // Kombinationen (falscher Typ, Bündel-in-Bündel) fallen auf Root zurück,
      // statt den Drop zu verwerfen.
      const resolveParent = (items, insertIndex, item) => {
        const parent = inferParentInstanceId(items, insertIndex, isBundleRef);
        if (!parent) return null;
        if (isBundleHeader(item, isBundleRef)) return null; // kein Bündel-in-Bündel
        const bundleHeader = items.find((it) => it?.instance_id === parent);
        const validation = canDrop({
          draggedItem: dragged.isFromPool
            ? { type: item.type, ref_id: item.ref_id, isFromPool: true }
            : { ...item, isFromPool: false },
          lernTyp: activeLernTyp,
          konfiguration,
          targetParentRefId: bundleHeader?.ref_id || null,
          systemBausteineById,
          aufgabenById,
        });
        return validation.ok ? parent : null;
      };

      // ── Pool → Sektor ──
      if (src.kind === 'pool' || src.kind === 'pool-system') {
        if (
          dragged.type === ITEM_TYPE.AUFGABE &&
          getUsedAufgabenIds(konfiguration, activeLernTyp).has(dragged.ref_id)
        ) {
          toast.error('Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.');
          return;
        }
        updateKonfiguration((prev) => {
          const sektoren = (prev?.[activeLernTyp] || []).map((s) => ({
            ...s,
            items: [...(s.items || [])],
          }));
          const target = sektoren.find((s) => s.sektor_id === toSektorId);
          if (!target) return prev;
          const insertAt = Math.max(0, Math.min(destination.index, target.items.length));
          const newItem = normalizeItem({
            type: dragged.type,
            ref_id: dragged.ref_id,
            parent_instance_id: null,
          });
          target.items.splice(insertAt, 0, newItem);
          const parent = resolveParent(target.items, insertAt, newItem);
          target.items[insertAt] = { ...newItem, parent_instance_id: parent };
          return { ...prev, [activeLernTyp]: sektoren };
        });
        return;
      }

      // ── Sektor → Sektor (bestehendes Item verschieben) ──
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
      const movedIsHeader = isBundleHeader(found.item, isBundleRef);

      updateKonfiguration((prev) => {
        const sektoren = (prev?.[activeLernTyp] || []).map((s) => ({
          ...s,
          items: [...(s.items || [])],
        }));
        const fromSektor = sektoren.find((s) => s.sektor_id === fromSektorId);
        const toSektor = sektoren.find((s) => s.sektor_id === toSektorId);
        if (!fromSektor || !toSektor) return prev;

        // Bündel-Header: Header + alle seine Kinder als zusammenhängenden Block
        // verschieben, damit das Bündel beim Umsortieren nicht zerfällt.
        if (movedIsHeader) {
          const headerId = found.item.instance_id;
          const block = fromSektor.items.filter(
            (it) => it.instance_id === headerId || it.parent_instance_id === headerId
          );
          const blockIds = new Set(block.map((b) => b.instance_id));
          fromSektor.items = fromSektor.items.filter((it) => !blockIds.has(it.instance_id));
          const reHeader = { ...found.item, parent_instance_id: null };
          const reChildren = block.filter((b) => b.instance_id !== headerId);
          const insertAt = Math.max(0, Math.min(destination.index, toSektor.items.length));
          toSektor.items.splice(insertAt, 0, reHeader, ...reChildren);
          return { ...prev, [activeLernTyp]: sektoren };
        }

        // Einzelnes Item.
        const fromIdx = fromSektor.items.findIndex((it) => it.instance_id === instanceId);
        if (fromIdx === -1) return prev;
        const [removed] = fromSektor.items.splice(fromIdx, 1);
        const insertAt = Math.max(0, Math.min(destination.index, toSektor.items.length));
        toSektor.items.splice(insertAt, 0, removed);
        const parent = resolveParent(toSektor.items, insertAt, removed);
        toSektor.items[insertAt] = { ...removed, parent_instance_id: parent };
        return { ...prev, [activeLernTyp]: sektoren };
      });
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