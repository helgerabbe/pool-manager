/**
 * useExportSelection.js
 *
 * Generischer Selection-Hook für Listen mit ID-basierter Mehrfachauswahl.
 * Bündelt das DRY-Pattern, das im MoodleExportManager bisher zweimal
 * (Einheiten + Basismodule) inline gestanden hat.
 *
 * Verträge:
 * - Beim Mounten/Reset wird die Auswahl mit allen verfügbaren IDs
 *   vorbelegt (Standard "alles ausgewählt").
 * - `toggle(id)` invertiert die Auswahl eines Einzelelements.
 * - `toggleAll()` schaltet zwischen "alle aus" und "alle an" um.
 * - `reset(ids?)` setzt die Auswahl explizit (z. B. beim Dialog-Öffnen).
 */

import { useCallback, useState } from 'react';

export function useExportSelection(initialIds = []) {
  const [selected, setSelected] = useState(() => new Set(initialIds));

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((availableIds) => {
    setSelected((prev) => {
      if (prev.size === availableIds.length) return new Set();
      return new Set(availableIds);
    });
  }, []);

  const reset = useCallback((ids = []) => {
    setSelected(new Set(ids));
  }, []);

  return { selected, toggle, toggleAll, reset };
}