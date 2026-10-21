// Gestaltungsvorgaben des Folien-Designers: wenige, gut lesbare Farben und Schriften.
export const FARBEN_HAUPT = [
  ['Schwarz', '#1a1a1a'], ['Dunkelblau', '#1e3a8a'], ['Dunkelrot', '#b91c1c'],
  ['Dunkelgrün', '#166534'], ['Orange', '#ea580c'], ['Grau', '#6b7280'],
];

export const FARBEN_WEITERE = [
  ['Weiß', '#ffffff'], ['Hellgrau', '#e5e7eb'], ['Blau', '#2563eb'], ['Hellblau', '#38bdf8'],
  ['Türkis', '#0d9488'], ['Petrol', '#155e75'], ['Grün', '#16a34a'], ['Hellgrün', '#84cc16'],
  ['Gelb', '#facc15'], ['Ocker', '#ca8a04'], ['Braun', '#92400e'], ['Rot', '#dc2626'],
  ['Weinrot', '#881337'], ['Pink', '#db2777'], ['Rosa', '#f9a8d4'], ['Lila', '#7c3aed'],
  ['Violett', '#6d28d9'], ['Flieder', '#c4b5fd'], ['Beige', '#fde68a'], ['Anthrazit', '#374151'],
];

export const SCHRIFTEN = [
  ['standard', 'Standard', 'font-folie'],
  ['gleichbreit', 'Gleiche Breite', 'font-mono'],
  ['hand', 'Handschrift', 'font-hand'],
  ['locker', 'Locker', 'font-locker'],
];
export const schriftKlasse = (k) => (SCHRIFTEN.find((s) => s[0] === k) || SCHRIFTEN[0])[2];

export const UEBERSCHRIFT_GROESSEN = [24, 32, 44, 56];

// Startwerte je Element, sobald es auf die Folie gezogen wird.
export const VORGABEN = {
  ueberschrift: { inhalt: 'Überschrift', stufe: 2, farbe: '#1a1a1a', schrift: 'standard' },
  text: { inhalt: 'Hier steht ein Text der Folie, z. B. ein Arbeitsauftrag.', groesse: 18, farbe: '#1a1a1a', schrift: 'standard' },
  rechteck: { form: 'eckig', farbe: '#1e3a8a' },
  ellipse: { form: 'ellipse', farbe: '#ea580c' },
  dreieck: { form: 'gleich', farbe: '#166534' },
  linie: { farbe: '#1a1a1a' },
  pfeil_duenn: { spitze: 'gefuellt', farbe: '#1a1a1a' },
  pfeil_breit: { fuellung: 'gefuellt', farbe: '#1e3a8a' },
  formel: { teile: [{ art: 'bruch', a: '1', b: '2' }], farbe: '#1a1a1a' },
  video: { darstellung: 'einbetten' },
};