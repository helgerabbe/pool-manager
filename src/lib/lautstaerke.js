// Lautstärke-Stufen (2026-10-24): drei feste Stufen mit eigenem Symbol.
// Einzelarbeit: still | fluestern. Partner-/Gruppenarbeit: fluestern | achten.
export const LAUTSTAERKE = {
  still: { name: 'Totale Stille', satz: 'Kein Wort, jeder arbeitet für sich.', hg: '#E3EFE6', text: '#24553A' },
  fluestern: { name: 'Flüsterstimme', satz: 'Nur flüstern.', hg: '#E6EEF8', text: '#2A4074' },
  achten: { name: 'Achtet auf eure Lautstärke', satz: 'Unterhaltet euch, aber achtet auf eure Lautstärke.', hg: '#FBEEDD', text: '#8A5A1C' },
};

export const LAUTSTAERKE_JE_SOZIALFORM = { EA: ['still', 'fluestern'], PA: ['fluestern', 'achten'], GA: ['fluestern', 'achten'] };

/** Farbe der Lärmampel für einen Wert 0-100 (grün -> gelb -> rot). */
export const ampelFarbe = (wert) => `hsl(${120 - wert * 1.2} 70% 45%)`;