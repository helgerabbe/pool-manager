import { useEffect, useState } from 'react';

/**
 * useStructuralUnsavedChanges
 * ─────────────────────────────────────────────────────────────────
 * Hook zum Tracking ungespeicherter Änderungen in der Struktur-Ansicht.
 * Blockiert Navigation und warnt vor Datenverlust.
 *
 * Rückgaben:
 * - isDirty: boolean — gibt an, ob ungespeicherte Änderungen vorliegen
 * - setIsDirty: (bool) => void — Dirty-State setzen
 * - shouldBlock: boolean — wird true, wenn Navigation blockiert werden soll
 * - setShouldBlock: (bool) => void — Blockierungs-State setzen
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

  // ── Manual navigation blocking via modal (handled in component) ──────────
  useEffect(() => {
    if (isDirty) {
      setShouldBlock(true);
    } else {
      setShouldBlock(false);
    }
  }, [isDirty]);

  return {
    isDirty,
    setIsDirty,
    shouldBlock,
    setShouldBlock,
  };
}