// Schnell-Folien (2026-10-26): frei gestaltbare Folien für den Stundenbau. Sie tragen Designer-Elemente in `lehrer`
// (Tafel) und `schueler` (Tablet) und werden im Foliendesigner bearbeitet.

const id = () => `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const el = (typ, x, y, b, h, daten = {}) => ({ id: id(), typ, x, y, b, h, ...daten });

export const leereFolie = () => ({ id: id(), titel: 'Inhaltsfolie', art: 'frei', lehrer: [], schueler: [] });

export const filmFolie = (url, titel = 'Film') => ({
  id: id(), titel, art: 'film',
  lehrer: [el('ueberschrift', 60, 30, 900, 60, { text: titel }), el('video', 162, 110, 700, 394, { quelle: url, darstellung: 'einbetten' })],
  schueler: [],
});

export const htmlFolie = (url, titel = 'Interaktive Seite') => ({
  id: id(), titel, art: 'html',
  lehrer: [el('extern', 40, 30, 944, 520, { quelle: url, url })],
  schueler: [el('extern', 40, 30, 944, 520, { quelle: url, url })],
});

/** Frei gestaltbare Folie (ohne feste Vorlage)? */
export const istFreieFolie = (f) => !f.vorlage;