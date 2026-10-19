// Basismethode (2026-10-19): Phasen ohne Methode bekommen die „Freie Methode“. Sie ist immer analog.
export const FREIE_METHODE = 'Freie Methode';
export const istFreieMethode = (p) => !p.methode?.trim() || p.methode === FREIE_METHODE;

/** Setzt bei Phasen ohne Methode die Freie Methode und erzwingt „analog“. */
export const mitBasismethode = (phasen) =>
  phasen.map((p) => (istFreieMethode(p) ? { ...p, methode: FREIE_METHODE, umsetzung: 'analog', umsetzung_begruendung: '' } : p));