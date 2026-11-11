/**
 * Varianten eines Elements (MasterAufgabe) — EINE Regel für alle Funktionen (2026-11-11):
 *
 *   - Das Element ist freigegeben, sobald EINE Variante freigegeben ist.
 *   - Das Element ist vollständig, sobald EINE Variante freigegeben ist.
 *     Solange noch keine freigegeben ist, müssen alle Varianten ausgearbeitet sein.
 *   - Weitere, noch nicht freigegebene Varianten ändern daran nichts. Sie
 *     reisen nicht in den Export und werden Schülern nicht gezeigt.
 *
 * Erwartet die lebenden Varianten (ohne sync_status='to_delete').
 * Spiegel fürs Frontend: src/lib/variantenStatus.js.
 */
export const istFreigegeben = (m) => m?.content_status === 'approved';

export function variantenStatus(varianten = []) {
  const freigegeben = varianten.some(istFreigegeben);
  const vollstaendig = freigegeben
    || (varianten.length > 0 && varianten.every((m) => m.is_complete === true));
  return { freigegeben, vollstaendig };
}

/** Die Varianten, die Schüler und Export bekommen: nur freigegebene; gibt es noch keine, alle. */
export function geltendeVarianten(varianten = []) {
  const frei = varianten.filter(istFreigegeben);
  return frei.length > 0 ? frei : varianten;
}