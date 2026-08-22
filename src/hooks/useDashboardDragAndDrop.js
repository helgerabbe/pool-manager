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
  getUsedAufgabenIds,
  groupItemsByParent,
  insertItemInSektorAtAbsolute,
  moveItemAbsolute,
} from '@/lib/lernpfadeUtils';

/** Klartext-Meldung für einen abgelehnten Drop. */
function dropFehlerText(validation) {
  switch (validation?.reason) {
    case 'bundle_in_bundle':
      return 'Ein Bündel kann nicht in ein anderes Bündel gelegt werden.';
    case 'duplicate_in_lerntyp':
      return 'Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.';
    case 'wrong_type':
      return 'Dieses Element passt nicht in dieses Bündel. Lernpakete gehören in ein Lernpaketebündel, Aufgaben in ein Aufgabenbündel und Projekte in ein Projektbündel.';
    default:
      return 'Dieses Element kann hier nicht abgelegt werden.';
  }
}

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
 * Baut die SICHTBARE Item-Reihenfolge eines Sektors — identisch zu der, die
 * LernpfadeSektor rendert (Kinder zugeklappter Bündel fehlen). Nur so passt
 * `destination.index` der DnD-Engine zu unseren Daten.
 */
function buildVisibleItems(items, isBundleRef, expandedBundles) {
  const grouped = groupItemsByParent(items, isBundleRef);
  const visible = [];
  for (const entry of grouped) {
    visible.push(entry.item);
    if (!entry.children) continue;
    const expanded = expandedBundles ? !!expandedBundles.has?.(entry.item.instance_id) : true;
    if (!expanded) continue;
    for (const child of entry.children) visible.push(child.item);
  }
  return visible;
}

/**
 * Übersetzt die Ablageposition (Index in der sichtbaren Liste) in
 *   - `parent`: Bündel-Zugehörigkeit, abgeleitet aus dem VORGÄNGER
 *     (Vorgänger ist ein Bündel-Kopf → Aufnahme ins Bündel; Vorgänger ist
 *     selbst ein Kind → gleiches Bündel; sonst Sektor-Ebene),
 *   - `absoluteIndex`: Position im flachen items-Array.
 * Ablegen zwischen zwei Sektor-Elementen holt ein Element damit auch wieder
 * aus einem Bündel heraus.
 */
function resolveDropTarget(items, visible, insertIndex, isBundleRef) {
  if (insertIndex <= 0) return { parent: null, absoluteIndex: 0 };
  const prev = visible[Math.min(insertIndex, visible.length) - 1];
  if (!prev) return { parent: null, absoluteIndex: items.length };
  const prevAbs = items.findIndex((it) => it?.instance_id === prev.instance_id);
  const absoluteIndex = prevAbs === -1 ? items.length : prevAbs + 1;
  const parent = isBundleHeader(prev, isBundleRef)
    ? prev.instance_id
    : prev.parent_instance_id || null;
  return { parent, absoluteIndex };
}

export function useDashboardDragAndDrop({
  activeLernTyp,
  readOnly,
  konfiguration,
  systemBausteineById,
  aufgabenById,
  updateKonfiguration,
  // Klappzustand der Bündel — muss mit der Sektor-Ansicht übereinstimmen,
  // damit Ablagepositionen korrekt umgerechnet werden.
  expandedBundles,
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

      const getItems = (konfig, sektorId) =>
        (konfig?.[activeLernTyp] || []).find((s) => s.sektor_id === sektorId)?.items || [];

      // Bestehendes Item? → instance_id + Herkunft ermitteln.
      const isMove = src.kind === 'sektor' || src.kind === 'bundle';
      let instanceId = null;
      if (draggableId.startsWith(PFAD_AUFGABE_PREFIX)) {
        instanceId = draggableId.slice(PFAD_AUFGABE_PREFIX.length);
      } else if (draggableId.startsWith(PFAD_SYSTEM_PREFIX)) {
        instanceId = draggableId.slice(PFAD_SYSTEM_PREFIX.length);
      }
      const found = instanceId
        ? findItemByInstanceId(konfiguration, activeLernTyp, instanceId)
        : null;
      if (isMove && !found) return;

      /**
       * Ablageziel für eine gegebene Konfiguration berechnen. Beim Verschieben
       * innerhalb des gleichen Sektors wird das gezogene Item vorher aus der
       * Liste genommen — genau so zählt die DnD-Engine.
       */
      const computeTarget = (konfig) => {
        const items = getItems(konfig, toSektorId);
        const list =
          found && found.sektorId === toSektorId
            ? items.filter((it) => it?.instance_id !== instanceId)
            : items;
        const visible = buildVisibleItems(list, isBundleRef, expandedBundles);
        const { parent, absoluteIndex } = resolveDropTarget(
          list,
          visible,
          destination.index,
          isBundleRef
        );
        return { parent, absoluteIndex };
      };

      const movedIsHeader = !!found && isBundleHeader(found.item, isBundleRef);
      const zielJetzt = computeTarget(konfiguration);

      // Aufnahme in ein Bündel validieren (Typ-Regeln); auf Sektor-Ebene nur
      // gegen Duplikate prüfen.
      if (zielJetzt.parent && !movedIsHeader) {
        const bundleItem = findItemByInstanceId(
          konfiguration,
          activeLernTyp,
          zielJetzt.parent
        )?.item;
        const validation = canDrop({
          draggedItem: dragged,
          lernTyp: activeLernTyp,
          konfiguration,
          targetParentRefId: bundleItem?.ref_id || null,
          systemBausteineById,
          aufgabenById,
        });
        if (!validation.ok) {
          toast.error(dropFehlerText(validation));
          return;
        }
      } else if (dragged.type === ITEM_TYPE.AUFGABE && dragged.isFromPool) {
        if (getUsedAufgabenIds(konfiguration, activeLernTyp).has(dragged.ref_id)) {
          toast.error('Diese Aufgabe ist bereits in diesem Lernpfad vorhanden.');
          return;
        }
      }

      // ── Pool → Pfad ──
      if (src.kind === 'pool' || src.kind === 'pool-system') {
        updateKonfiguration((prev) => {
          const { parent, absoluteIndex } = computeTarget(prev);
          return insertItemInSektorAtAbsolute(
            prev,
            activeLernTyp,
            toSektorId,
            {
              type: dragged.type,
              ref_id: dragged.ref_id,
              // Bündel-Bausteine selbst werden nie Kind eines Bündels.
              parent_instance_id:
                dragged.type === ITEM_TYPE.SYSTEM && isBundleRef(dragged.ref_id)
                  ? null
                  : parent,
            },
            absoluteIndex
          );
        });
        return;
      }

      if (!found) return;
      const fromSektorId = found.sektorId;

      // Bündel-Kopf: Kopf + Kinder als Block verschieben (immer auf Sektor-Ebene).
      if (movedIsHeader) {
        updateKonfiguration((prev) => {
          const sektoren = (prev?.[activeLernTyp] || []).map((s) => ({
            ...s,
            items: [...(s.items || [])],
          }));
          const fromSektor = sektoren.find((s) => s.sektor_id === fromSektorId);
          const toSektor = sektoren.find((s) => s.sektor_id === toSektorId);
          if (!fromSektor || !toSektor) return prev;

          const headerId = found.item.instance_id;
          const block = fromSektor.items.filter(
            (it) => it.instance_id === headerId || it.parent_instance_id === headerId
          );
          const blockIds = new Set(block.map((b) => b.instance_id));
          fromSektor.items = fromSektor.items.filter((it) => !blockIds.has(it.instance_id));
          const visible = buildVisibleItems(toSektor.items, isBundleRef, expandedBundles);
          const { absoluteIndex } = resolveDropTarget(
            toSektor.items,
            visible,
            destination.index,
            isBundleRef
          );
          const reHeader = { ...found.item, parent_instance_id: null };
          const reChildren = block.filter((b) => b.instance_id !== headerId);
          toSektor.items.splice(absoluteIndex, 0, reHeader, ...reChildren);
          return { ...prev, [activeLernTyp]: sektoren };
        });
        return;
      }

      // Einzelnes Item (Aufgabe oder einfacher System-Baustein).
      updateKonfiguration((prev) => {
        const fromIdx = getItems(prev, fromSektorId).findIndex(
          (it) => it.instance_id === instanceId
        );
        if (fromIdx === -1) return prev;
        const { parent, absoluteIndex } = computeTarget(prev);
        return moveItemAbsolute(
          prev,
          activeLernTyp,
          fromSektorId,
          fromIdx,
          toSektorId,
          absoluteIndex,
          parent
        );
      });
    },
    [
      readOnly,
      activeLernTyp,
      konfiguration,
      systemBausteineById,
      aufgabenById,
      updateKonfiguration,
      expandedBundles,
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