import { useState, useCallback, useEffect } from 'react';

/**
 * useDraftState Hook für persistente Draft-Verwaltung
 * Speichert Entwürfe im localStorage mit Auto-Restore beim Reload
 * 
 * @param {string} draftKey - Eindeutiger Identifier für Draft im localStorage
 * @param {any} initialData - Initiale Daten (fallback wenn kein Draft existiert)
 * @param {number} debounceMs - Debounce für localStorage-Saves (default: 500ms)
 * @returns {Object} { data, setData, isDraft, clearDraft, hasDraft }
 */
export function useDraftState(draftKey, initialData = null, debounceMs = 500) {
  const [data, setData] = useState(initialData);
  const [isDraft, setIsDraft] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Beim Mount: Versuche Draft zu laden
  useEffect(() => {
    const stored = localStorage.getItem(draftKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(parsed);
        setIsDraft(true);
        setHasDraft(true);
      } catch (e) {
        console.error(`Failed to parse draft for key ${draftKey}:`, e);
      }
    }
  }, [draftKey]);

  // Speichere Daten mit Debounce
  const updateData = useCallback((newData) => {
    setData(newData);
    setIsDraft(true);
    
    // Clear existing timer
    if (debounceTimer) clearTimeout(debounceTimer);
    
    // Set new timer für localStorage
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify(newData));
      setHasDraft(true);
    }, debounceMs);
    
    setDebounceTimer(timer);
  }, [draftKey, debounceMs, debounceTimer]);

  // Cleanup Timer beim Unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [debounceTimer]);

  // Draft löschen
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setData(initialData);
    setIsDraft(false);
    setHasDraft(false);
  }, [draftKey, initialData]);

  return { data, setData: updateData, isDraft, clearDraft, hasDraft };
}

/**
 * Hook zum Zeigen einer "Restore Draft?" Modal beim Laden
 */
export function useDraftRestore(draftKey) {
  const [showRestore, setShowRestore] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(draftKey);
    if (stored) {
      setShowRestore(true);
    }
  }, [draftKey]);

  const restoreDraft = useCallback(() => {
    setShowRestore(false);
    return JSON.parse(localStorage.getItem(draftKey));
  }, [draftKey]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setShowRestore(false);
  }, [draftKey]);

  return { showRestore, restoreDraft, discardDraft };
}