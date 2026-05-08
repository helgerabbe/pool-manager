/**
 * useAirGapHandoverState.js
 *
 * Verwaltet die manuellen "Übergeben"-Haken pro Einheit + Payload-Block
 * im localStorage. Invalidiert die Haken automatisch, sobald der live
 * berechnete `system_context_hash` von dem Hash abweicht, der beim
 * letzten Setzen des Hakens festgehalten wurde.
 *
 * Speicherformat:
 *   localStorage[mbk-airgap-handover:<einheitId>] =
 *     {
 *       "system_context":  { delivered: true,  hash: "abc..." },
 *       "structure":       { delivered: false, hash: null },
 *       "task_content":    { delivered: true,  hash: "abc..." },
 *       "micro":           { delivered: false, hash: null }
 *     }
 *
 * Reine Frontend-Zustandsverwaltung — keine Backend-Persistenz.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

export const AIR_GAP_BLOCKS = ['system_context', 'structure', 'task_content', 'micro'];

const storageKey = (einheitId) => `mbk-airgap-handover:${einheitId}`;

function readState(einheitId) {
  try {
    const raw = localStorage.getItem(storageKey(einheitId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(einheitId, state) {
  try {
    localStorage.setItem(storageKey(einheitId), JSON.stringify(state));
  } catch {
    // localStorage voll oder im Privacy-Mode → Haken sind dann nur in-memory.
  }
}

export function useAirGapHandoverState({ einheitId, currentHash }) {
  const [state, setState] = useState(() => (einheitId ? readState(einheitId) : {}));

  // Beim Wechsel der Einheit den State neu laden.
  useEffect(() => {
    if (!einheitId) {
      setState({});
      return;
    }
    setState(readState(einheitId));
  }, [einheitId]);

  // Markieren / unmarkieren — speichert immer den aktuellen Hash mit.
  const setDelivered = useCallback(
    (blockKey, delivered) => {
      if (!einheitId || !AIR_GAP_BLOCKS.includes(blockKey)) return;
      setState((prev) => {
        const next = {
          ...prev,
          [blockKey]: {
            delivered: !!delivered,
            hash: delivered ? currentHash || null : null,
            timestamp: delivered ? new Date().toISOString() : null,
          },
        };
        writeState(einheitId, next);
        return next;
      });
    },
    [einheitId, currentHash]
  );

  // Status pro Block: delivered + isStale (Haken vorhanden, aber Hash hat sich
  // geändert). Stale wird im UI als 🟡-Hinweis angezeigt; der Haken bleibt
  // dann visuell entfernt, der zugehörige State ist aber noch gespeichert,
  // damit die Lehrkraft sieht, "ich hatte das schonmal als geliefert markiert".
  const blockStatus = useMemo(() => {
    const result = {};
    for (const key of AIR_GAP_BLOCKS) {
      const entry = state[key] || {};
      const delivered = !!entry.delivered;
      const storedHash = entry.hash || null;
      const isStale =
        delivered &&
        currentHash &&
        storedHash &&
        storedHash !== currentHash;
      result[key] = {
        delivered: delivered && !isStale, // im UI nur als delivered zählen, wenn Hash passt
        rawDelivered: delivered,           // zur Anzeige des „war mal übergeben"-Hinweises
        isStale,
        storedHash,
        timestamp: entry.timestamp || null,
      };
    }
    return result;
  }, [state, currentHash]);

  const deliveredCount = AIR_GAP_BLOCKS.filter((k) => blockStatus[k].delivered).length;

  const reset = useCallback(() => {
    if (!einheitId) return;
    setState({});
    writeState(einheitId, {});
  }, [einheitId]);

  /**
   * Invalidiert den localStorage-Haken eines Blocks, ohne den State komplett
   * zu löschen. Wird vom Panel aufgerufen, sobald die DB-Drift-Erkennung
   * meldet, dass eine Quelle in diesem Block out-of-sync ist (Spec §5.3:
   * „bei System-Änderung Haken automatisch entfernen").
   */
  const invalidateBlock = useCallback(
    (blockKey) => {
      if (!einheitId || !AIR_GAP_BLOCKS.includes(blockKey)) return;
      setState((prev) => {
        if (!prev[blockKey]?.delivered) return prev;
        const next = {
          ...prev,
          [blockKey]: { delivered: false, hash: null, timestamp: null },
        };
        writeState(einheitId, next);
        return next;
      });
    },
    [einheitId]
  );

  return {
    blockStatus,
    deliveredCount,
    totalBlocks: AIR_GAP_BLOCKS.length,
    setDelivered,
    invalidateBlock,
    reset,
  };
}