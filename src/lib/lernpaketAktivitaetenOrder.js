/**
 * lernpaketAktivitaetenOrder.js
 *
 * Reine Logik, in welcher Reihenfolge die Aktivitäten eines Lernpakets dem
 * Schüler präsentiert werden – abhängig von der `lernpaket_logik`:
 *
 *   - 'standard'        → Input → Übung → Abschluss  (der Reihe nach, sequenziell gegated)
 *   - 'fast_track'      → Input → Abschluss → Übung   (Input zuerst, dann Check, dann optional üben)
 *   - 'wissensspeicher' → alle Phasen, alles frei zugänglich (kein Gating)
 *   - 'test_only'       → behandeln wir wie 'standard' (Sonderfall Zwischentest)
 *
 * Zusätzlich: Sobald ein Standard-/Fast-Track-Paket einmal VOLLSTÄNDIG
 * durchgearbeitet wurde, verhält es sich wie ein Wissensspeicher – alle
 * Aktivitäten sind dann frei wiederholbar (Gating fällt weg), die
 * Erledigt-Markierungen bleiben erhalten.
 */

export const PHASEN_REIHENFOLGE = {
  standard: ['Input', 'Übung', 'Abschluss'],
  fast_track: ['Input', 'Abschluss', 'Übung'],
  wissensspeicher: ['Input', 'Übung', 'Abschluss'],
  test_only: ['Input', 'Übung', 'Abschluss'],
};

/**
 * Sortiert eine Liste von LernpaketPhaseAktivitaet nach der Phasen-Reihenfolge
 * des jeweiligen Logik-Typs; innerhalb einer Phase nach `reihenfolge`.
 *
 * @param {Array}  aktivitaeten  LernpaketPhaseAktivitaet-Records
 * @param {string} logik         lernpaket_logik
 * @returns {Array} sortierte Aktivitäten
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
 * Wissensspeicher = nie gegated. Standard/Fast-Track = gegated, SOLANGE das
 * Paket noch nicht vollständig durchgearbeitet wurde.
 *
 * @param {string}  logik             lernpaket_logik
 * @param {boolean} bereitsAbgeschlossen ob ALLE Aktivitäten schon erledigt sind
 * @returns {boolean}
 */
export function istLernpaketGegated(logik, bereitsAbgeschlossen) {
  if (logik === 'wissensspeicher') return false;
  if (bereitsAbgeschlossen) return false;
  return true;
}