import { useEffect, useState, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * useStructuralUnsavedChanges
 * ─────────────────────────────────────────────────────────────────
 * Hook zum Tracking ungespeicherter Änderungen in der Struktur-Ansicht.
 * Blockiert Navigation und warnt vor Datenverlust.
 *
 * Rückgaben:
 * - isDirty: boolean — gibt an, ob ungespeicherte Änderungen vorliegen
 * - setIsDirty: (bool) => void — Dirty-State setzen
 * - shouldBlockNavigation: boolean — wird true, wenn Blocker aktiv ist
 */

export function useStructuralUnsavedChanges() {
  const [isDirty, setIsDirty] = useState(false);
  const [shouldBlock, setShouldBlock] = useState(false);

  // ── Browser Beforeunload Warning ──────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Du hast ungespeicherte Änderungen in der Struktur.';
        return 'Du hast ungespeicherte Änderungen in der Struktur.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ── React Router Blocker ──────────────────────────────────────────────────
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (isDirty && currentLocation.pathname !== nextLocation.pathname) {
      setShouldBlock(true);
      return true; // Block navigation
    }
    return false;
  });

  return {
    isDirty,
    setIsDirty,
    blocker,
    shouldBlock,
    setShouldBlock,
  };
}