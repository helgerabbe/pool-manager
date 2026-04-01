import { useState, useCallback } from 'react';

/**
 * Hook für visuellen "Saved"-Indikator
 * Zeigt kurz einen grünen Checkmark nach erfolgreicher Mutation
 * 
 * @param {number} displayDurationMs - Wie lange der Indicator angezeigt wird (default: 1500ms)
 * @returns {Object} { showSavedIndicator, triggerSaved, isSaving }
 */
export function useSavedIndicator(displayDurationMs = 1500) {
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const triggerSaved = useCallback(() => {
    setShowSavedIndicator(true);
    setIsSaving(false);
    
    const timer = setTimeout(() => {
      setShowSavedIndicator(false);
    }, displayDurationMs);

    return () => clearTimeout(timer);
  }, [displayDurationMs]);

  const triggerSaving = useCallback(() => {
    setIsSaving(true);
  }, []);

  return { showSavedIndicator, triggerSaved, isSaving, triggerSaving };
}

/**
 * Komponente: SavedIndicator – visueller Indikator neben Titeln
 * Wird kurz grün angezeigt, wenn Daten gespeichert wurden
 */
export function SavedIndicator({ show = false }) {
  if (!show) return null;

  return (
    <div className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium animate-in fade-in duration-300">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      Gespeichert
    </div>
  );
}