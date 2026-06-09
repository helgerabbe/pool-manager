import { useCallback, useEffect, useState } from 'react';

/**
 * Wiederverwendbare Schüler-Lese-Einstellung: Schriftgröße (klein | mittel | groß).
 *
 * Wird von allen Lese-Komponenten (Text lesen, künftige Erklär-/Hinweistexte)
 * geteilt, damit leseschwächere Schüler ihre bevorzugte Größe EINMAL wählen und
 * sie überall greift. Persistiert in localStorage, damit die Wahl über Seiten
 * und Sitzungen hinweg erhalten bleibt.
 */
const STORAGE_KEY = 'schueler_lese_schriftgroesse';
export const LESE_GROESSEN = ['klein', 'mittel', 'gross'];
const DEFAULT_GROESSE = 'mittel';

export function useLeseEinstellungen() {
  const [groesse, setGroesseState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_GROESSE;
    const gespeichert = window.localStorage.getItem(STORAGE_KEY);
    return LESE_GROESSEN.includes(gespeichert) ? gespeichert : DEFAULT_GROESSE;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, groesse);
    }
  }, [groesse]);

  const setGroesse = useCallback((next) => {
    if (LESE_GROESSEN.includes(next)) setGroesseState(next);
  }, []);

  return { groesse, setGroesse };
}