import { useMemo } from 'react';
import { usePruefbefunde } from '@/hooks/usePruefung';

/**
 * Offene Hinweise der Vollständigkeitsprüfung (eigene Prüfung, Moodle-Team,
 * Schülermeldungen), nachschlagbar je Element. Liest dieselbe Abfrage wie der
 * Prüfbereich – eine Entscheidung dort oder am Element wirkt an beiden Stellen.
 * Rückgabe: (ids) => Hinweise, die an einem dieser Elemente hängen.
 */
export function useElementHinweise(einheitId) {
  const { data = [] } = usePruefbefunde(einheitId);
  return useMemo(() => {
    const jeZiel = new Map();
    for (const b of data) {
      if ((b.entscheidung || 'offen') !== 'offen' || b.dublette_status === 'dublette') continue;
      jeZiel.set(b.ziel_id, [...(jeZiel.get(b.ziel_id) || []), b]);
    }
    return (ids) => ids.flatMap((id) => jeZiel.get(id) || []);
  }, [data]);
}