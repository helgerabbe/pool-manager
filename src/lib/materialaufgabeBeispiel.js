// Beispiel für die Materialaufgabe (Skizze): ein Material in vier möglichen Arten, dazu Fragen mit eindeutigen Lösungen.
export const MATERIAL_ARTEN = [
  { key: 'text', label: 'Text' },
  { key: 'bild', label: 'Bild' },
  { key: 'audio', label: 'Audio' },
  { key: 'film', label: 'Film' },
];

export const MATERIAL_TEXT = 'Am Bahnhof fragt eine Frau nach dem nächsten Zug nach München. Der Mann am Schalter sagt: „Der nächste Zug fährt um 14:40 Uhr von Gleis 3.“ Die Frau kauft eine einfache Fahrkarte.';
export const MATERIAL_BILD = 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=900';

export const MATERIAL_FRAGEN = [
  { id: 'f1', art: 'kurz', frage: 'Wohin möchte die Frau fahren?', loesung: 'München' },
  { id: 'f2', art: 'auswahl', frage: 'Wann fährt der Zug?', optionen: ['14:20', '14:40', '15:20'], loesung: '14:40' },
  { id: 'f3', art: 'rf', frage: 'Sie kauft eine Hin- und Rückfahrkarte.', loesung: 'Falsch' },
];

export const istRichtig = (f, a) => (a || '').trim().toLowerCase() === f.loesung.toLowerCase();