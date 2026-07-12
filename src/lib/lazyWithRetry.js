import { lazy } from 'react';

/**
 * Wrapper um React.lazy():
 * Schlägt der dynamische Import fehl (typisch: nach einem Deployment liegt im
 * Browser noch eine alte index-Datei, die auf nicht mehr existierende,
 * gehashte Chunk-Dateien zeigt), wird die Seite EINMAL automatisch neu
 * geladen, um die aktuelle Version zu holen. Ein sessionStorage-Flag
 * verhindert eine Endlos-Reload-Schleife bei echten Fehlern.
 */
export default function lazyWithRetry(importFn) {
  return lazy(async () => {
    try {
      const module = await importFn();
      sessionStorage.removeItem('chunk_reload_attempted');
      return module;
    } catch (error) {
      const alreadyTried = sessionStorage.getItem('chunk_reload_attempted') === 'true';
      if (!alreadyTried) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
        // Nie auflösendes Promise: Die Seite lädt ohnehin gleich neu.
        return new Promise(() => {});
      }
      throw error;
    }
  });
}