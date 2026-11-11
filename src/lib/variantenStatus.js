/**
 * Varianten eines Abschluss-Elements (MasterAufgabe) — eine Regel (2026-11-11):
 * Das Element ist vollständig, sobald EINE Variante freigegeben ist. Solange
 * noch keine freigegeben ist, müssen alle Varianten ausgearbeitet sein.
 * Weitere, noch nicht freigegebene Varianten ändern daran nichts und werden
 * Schülern nicht gezeigt.
 *
 * Spiegel fürs Backend: base44/shared/variantenStatus.js.
 */
export const istFreigegeben = (m) => m?.content_status === 'approved';

export function variantenVollstaendig(varianten = [], istAusgearbeitet = (m) => m.is_complete === true) {
  if (varianten.some(istFreigegeben)) return true;
  return varianten.length > 0 && varianten.every(istAusgearbeitet);
}

/** Die Varianten, die Schüler und Export bekommen: nur freigegebene; gibt es noch keine, alle. */
export function geltendeVarianten(varianten = []) {
  const frei = varianten.filter(istFreigegeben);
  return frei.length > 0 ? frei : varianten;
}