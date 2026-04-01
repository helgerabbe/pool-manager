/**
 * useSessionStorageState.js
 *
 * Phase 6.4: sessionStorage-basierter State Hook für View-Zustände
 *
 * Unterschied zu localStorage:
 * - sessionStorage: Wird gelöscht, wenn der Browser/Tab geschlossen wird
 * - localStorage: Persisiert über Sessions hinweg
 *
 * Use-Cases für sessionStorage:
 * - "Bin ich in der Detail-Ansicht oder Struktur-Ansicht?"
 * - "Welches Themenfeld ist gerade selektiert?"
 * - "Ist der Sidebar expandiert?"
 * - Alles, was "nur für diese Session" relevant ist
 *
 * Use-Cases für localStorage:
 * - Theme-Präferenzen (Dark/Light Mode)
 * - User-Einstellungen (Sprache)
 * - Persistente UI-Konfiguration
 *
 * Usage:
 * const [viewMode, setViewMode] = useSessionStorageState('workspace-viewMode', 'detail');
 *
 * const [selectedEinheitId, setSelectedEinheitId] = useSessionStorageState(
 *   'workspace-selectedEinheit',
 *   null
 * );
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook für sessionStorage-basierten State Management
 *
 * @param {string} key - Der sessionStorage Key (wird mit namespace prefixiert)
 * @param {any} initialValue - Default-Wert, falls Key nicht in sessionStorage existiert
 * @param {Object} options - Optionale Konfiguration
 * @param {string} options.namespace - Prefix für den Key (default: 'base44')
 * @param {boolean} options.serialize - JSON serialisieren? (default: true)
 * @returns {[any, Function]} [value, setValue]
 *
 * @example
 * const [viewMode, setViewMode] = useSessionStorageState('workspace-viewMode', 'detail');
 *
 * // Liest aus sessionStorage['base44:workspace-viewMode']
 * // Falls nicht vorhanden, nutzt initialValue 'detail'
 *
 * setViewMode('structure');
 * // Speichert in sessionStorage['base44:workspace-viewMode']
 */
export function useSessionStorageState(key, initialValue, options = {}) {
  const { namespace = 'base44', serialize = true } = options;
  const fullKey = `${namespace}:${key}`;

  // Initialisiere State mit Wert aus sessionStorage oder initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }

      const item = window.sessionStorage.getItem(fullKey);
      if (item === null) {
        return initialValue;
      }

      // Versuche zu deserialisieren, falls serialize=true
      return serialize ? JSON.parse(item) : item;
    } catch (error) {
      console.warn(`Failed to read sessionStorage[${fullKey}]:`, error);
      return initialValue;
    }
  });

  // setValue: Speichere in sessionStorage + update State
  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          const stringValue = serialize
            ? JSON.stringify(valueToStore)
            : valueToStore;
          window.sessionStorage.setItem(fullKey, stringValue);
        }
      } catch (error) {
        console.warn(`Failed to write to sessionStorage[${fullKey}]:`, error);
      }
    },
    [fullKey, serialize, storedValue]
  );

  return [storedValue, setValue];
}

/**
 * Hook für Cross-Tab sessionStorage Sync
 * (Falls ein anderer Tab die sessionStorage ändert, wird das hier aktualisiert)
 *
 * @param {string} key - sessionStorage Key
 * @param {any} initialValue - Default-Wert
 * @returns {[any, Function]} [value, setValue]
 *
 * @example
 * const [viewMode, setViewMode] = useSessionStorageStateWithSync('workspace-viewMode', 'detail');
 *
 * // Wenn Tab A setViewMode('structure') aufruft,
 * // wird Tab B automatisch aktualisiert (via storage event)
 */
export function useSessionStorageStateWithSync(key, initialValue, options = {}) {
  const { namespace = 'base44', serialize = true } = options;
  const fullKey = `${namespace}:${key}`;
  const [storedValue, setStoredValue] = useSessionStorageState(
    key,
    initialValue,
    options
  );

  // Listener für storage events (wenn ein anderer Tab die sessionStorage ändert)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === fullKey && event.newValue !== null) {
        try {
          const newValue = serialize ? JSON.parse(event.newValue) : event.newValue;
          setStoredValue(newValue);
        } catch (error) {
          console.warn(`Failed to sync sessionStorage[${fullKey}]:`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fullKey, serialize]);

  return [storedValue, setStoredValue];
}