import React from 'react';

/**
 * ContextStrictionManager
 * Verwaltet UI-State-Isolation zwischen Bereichen (Einheiten vs. Basismodule)
 * Verhindert, dass State-Fragmente beim Bereichswechsel erhalten bleiben
 */

export const CONTEXT_SCOPES = {
  EINHEITEN: 'einheiten',
  BASISMODULE: 'basismodule',
};

/**
 * Hook zum Resetten von einheitsspezifischen States
 * Wird beim Betreten des Basismodule-Bereichs aufgerufen
 */
export function useContextStrictionReset() {
  const resetEinheitenContext = () => {
    // Cleane alle einheiten-spezifischen localStorage Keys
    const keys = [
      'workspace_view_*', // pattern für verschiedene unit-views
      'selected_einheit_id',
      'selected_themenfeld_id',
      'einheit_filter',
    ];

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('workspace_view_') || key.startsWith('einheit_')) {
        localStorage.removeItem(key);
      }
    });

    // Cleane Draft-States von Einheiten
    Object.keys(localStorage).forEach((key) => {
      if (key.includes('aufgaben-') || key.includes('mapping-')) {
        localStorage.removeItem(key);
      }
    });

    console.log('[ContextStriction] Einheiten-Context geleert');
  };

  const resetBasismoduleContext = () => {
    // Cleane basismodul-spezifische States
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('basismodul_')) {
        localStorage.removeItem(key);
      }
    });

    console.log('[ContextStriction] Basismodule-Context geleert');
  };

  return { resetEinheitenContext, resetBasismoduleContext };
}

/**
 * Hook zum Tracken des aktuellen Kontext-Scopes
 * Trigger Reset beim Scope-Wechsel
 */
export function useContextScope(currentScope) {
  const [previousScope, setPreviousScope] = React.useState(currentScope);
  const { resetEinheitenContext, resetBasismoduleContext } = useContextStrictionReset();

  React.useEffect(() => {
    if (currentScope !== previousScope) {
      // Scope hat sich geändert → Reset des vorherigen Scopes
      if (previousScope === CONTEXT_SCOPES.EINHEITEN) {
        resetEinheitenContext();
      } else if (previousScope === CONTEXT_SCOPES.BASISMODULE) {
        resetBasismoduleContext();
      }

      setPreviousScope(currentScope);
    }
  }, [currentScope, previousScope, resetEinheitenContext, resetBasismoduleContext]);
}