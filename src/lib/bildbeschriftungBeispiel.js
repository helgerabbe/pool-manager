// Skizzen-Beispiel für „Bildbeschriftung“: Markierungen in Prozent der Bildfläche.
export const MARKEN = [
  { x: 50, y: 18, loesung: 'Blüte' },
  { x: 72, y: 45, loesung: 'Blatt' },
  { x: 50, y: 62, loesung: 'Stängel' },
  { x: 50, y: 88, loesung: 'Wurzel' },
];
export const WORTE = ['Wurzel', 'Knospe', 'Blatt', 'Blüte', 'Samen', 'Stängel'];

/** Wort auf Marke setzen; ein Wort steht höchstens an einer Marke. */
export const setzeWort = (zu, i, wort) => ({ ...Object.fromEntries(Object.entries(zu).filter(([, w]) => w !== wort)), [i]: wort });