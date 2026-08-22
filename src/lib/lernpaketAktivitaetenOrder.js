/**
 * lernpaketAktivitaetenOrder.js
 *
 * Reine Logik, wie die Aktivitäten eines Lernpakets dem Schüler präsentiert
 * werden – abhängig vom Zugang (siehe lib/lernpaketZugang.js):
 *
 *   - 'standard'        → Input → Übung → Abschluss, jeweils in der angelegten
 *                         Reihenfolge, sequenziell gegated (das nächste Element
 *                         ist gesperrt, bis das aktuelle erledigt ist). Alles
 *                         ist Pflicht.
 *   - 'fast_track'      → Der Schüler bewegt sich FREI im Lernpaket: Input und
 *                         Übungen darf er ansehen oder überspringen, der
 *                         ABSCHLUSS ist aber Pflicht. Er kann also sofort zum
 *                         Abschluss springen und ihn versuchen.
 *   - 'wissensspeicher' → Völlig frei, nichts ist Pflicht: hineinschauen,
 *                         nachlesen, jederzeit wieder verlassen.
 *   - 'test_only'       → wie 'standard' (Sonderfall Zwischentest).
 *
 * Zusätzlich: Sobald ein Standard-Paket vollständig durchgearbeitet wurde,
 * verhält es sich wie ein Wissensspeicher – alle Aktivitäten sind dann frei
 * wiederholbar, die Erledigt-Markierungen bleiben erhalten.
 */

export const PHASEN_REIHENFOLGE = {
  standard: ['Input', 'Übung', 'Abschluss'],
  fast_track: ['Input', 'Übung', 'Abschluss'],
  wissensspeicher: ['Input', 'Übung', 'Abschluss'],
  test_only: ['Input', 'Übung', 'Abschluss'],
};

/**
 * Ob eine Phase optional ist (zählt nicht für den Paket-Abschluss und wird
 * nie gegated).
 *   - Fast-Track: alles außer dem Abschluss ist optional.
 *   - Wissensspeicher: alles ist optional.
 */
export function istPhaseOptional(phase, lerntyp, zugang = null) {
  if (zugang === 'wissensspeicher') return true;
  if (zugang === 'fast_track') return phase !== 'Abschluss';
  // Ohne bekannten Zugang: Bestandsverhalten (Pragmatiker = Fast-Track).
  if (!zugang && lerntyp === 'pragmatiker') return phase === 'Übung';
  return false;
}

/**
 * Sortiert LernpaketPhaseAktivitaet-Records nach Phasen-Reihenfolge;
 * innerhalb einer Phase nach `reihenfolge`.
 */
export function sortAktivitaetenNachLogik(aktivitaeten = [], logik = 'standard') {
  const order = PHASEN_REIHENFOLGE[logik] || PHASEN_REIHENFOLGE.standard;
  const phaseIndex = (phase) => {
    const i = order.indexOf(phase);
    return i === -1 ? 99 : i;
  };
  return [...aktivitaeten].sort((a, b) => {
    const pd = phaseIndex(a.phase) - phaseIndex(b.phase);
    if (pd !== 0) return pd;
    return (a.reihenfolge || 0) - (b.reihenfolge || 0);
  });
}

/**
 * Ob das Lernpaket sequenzielles Gating hat (eine Aktivität nach der anderen).
 * Nur 'standard'/'test_only' sind gegated – und auch dort fällt das Gating weg,
 * sobald das Paket einmal vollständig durchgearbeitet wurde.
 */
export function istLernpaketGegated(logik, bereitsAbgeschlossen) {
  if (logik === 'wissensspeicher' || logik === 'fast_track') return false;
  if (bereitsAbgeschlossen) return false;
  return true;
}