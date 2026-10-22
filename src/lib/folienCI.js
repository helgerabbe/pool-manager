// Gestaltungsregeln (Corporate Identity) der gestalteten Folien – Stand 2026-10-22, Teil 1.
// Leitidee: ruhig, pastellig, aufgeräumt; Funktion erkennbar an Farbe + Symbol + Überschrift.
// Bilder: fotorealistisch, keine Comicfiguren.

export const CI_GRUND = {
  hintergrund: '#FAF8F4', // warmes Off-White
  text: '#2E3440',        // weiches Anthrazit statt Schwarz
  schrift: 'Inter, Arial, sans-serif',
};

// Inhaltsboxen: immer gleiche Farbe, gleiches Symbol (lucide-Name), gleiche Überschrift.
export const CI_BOXEN = {
  aufgabe:  { titel: 'Aufgabe',  symbol: 'PenLine',   hg: '#E3EEF9', rand: '#B9D2EE', text: '#1E3A6E' },
  merksatz: { titel: 'Merksatz', symbol: 'Lightbulb', hg: '#FBF3D5', rand: '#EBD9A0', text: '#6B4423' },
  hinweis:  { titel: 'Hinweis zur Arbeitsweise', symbol: 'Info', hg: '#E6F2EA', rand: '#BFDCC9', text: '#24553A' },
};

// Folientyp-Kennung: eine weiche Form in der rechten oberen Ecke, sonst ruhiger Hintergrund.
export const CI_FOLIENTYPEN = {
  methode:   { name: 'Methodenfolie',  farbe: '#DCEBE1' },
  aufgabe:   { name: 'Aufgabenfolie',  farbe: '#DCE8F5' },
  sicherung: { name: 'Sicherungsfolie', farbe: '#F7EDCB' },
  impuls: { name: 'Impulsfolie', farbe: '#D9EEEC' },             // Einstieg: Bild, Frage oder Problem, das neugierig macht
  organisation: { name: 'Organisationsfolie', farbe: '#E7E4F3' }, // z. B. „Finde einen Partner“, „Hör zu“
  reflexion: { name: 'Reflexionsfolie', farbe: '#F5E1DC' },       // Metakognition, Rückblick auf die Stunde
};

// Teil 2: Bedienelemente. Runde Ecken (12px), keine harten Schatten, ruhige Pastell-Zustände.
export const CI_BUTTONS = {
  haupt:   { name: 'Hauptaktion (z. B. „Fertig“)', label: 'Fertig', hg: '#3E5C8A', text: '#FFFFFF', rand: '#3E5C8A' },
  pruefen: { name: 'Prüfen (Lösung kontrollieren)', label: 'Prüfen', symbol: 'SearchCheck', hg: '#E3EEF9', text: '#1E3A6E', rand: '#7FA6D6' },
  neben:   { name: 'Nebenaktion (z. B. „Zurück“)', label: 'Zurück', hg: '#FFFFFF', text: '#3E5C8A', rand: '#B9D2EE' },
  abbrechen: { name: 'Abbrechen', label: 'Abbrechen', symbol: 'X', hg: '#FFFFFF', text: '#6A7181', rand: '#D6DCE5' },
  zuruecksetzen: { name: 'Von vorne / Zurücksetzen', label: 'Von vorne', symbol: 'RotateCcw', hg: '#FBEFEA', text: '#8A4B3C', rand: '#EBC9BE' },
  erledigt:{ name: 'Erledigt-Zustand', label: 'Erledigt', symbol: 'Check', hg: '#DCEBE1', text: '#24553A', rand: '#BFDCC9' },
};

export const CI_EINGABE = {
  feld:   { hg: '#FFFFFF', rand: '#D6DCE5', text: '#2E3440', platzhalter: '#9AA3B2' },
  fokus:  { rand: '#7FA6D6', schein: '#E3EEF9' },
  label:  { text: '#4B5565' },
};

// Teil 3: Überschriften, Textfelder, Timer.
export const CI_TEXT = {
  titel:     { name: 'Folientitel', groesse: 40, gewicht: 700, farbe: '#2E3440' },
  zwischen:  { name: 'Zwischenüberschrift', groesse: 28, gewicht: 600, farbe: '#3E5C8A' },
  fliess:    { name: 'Fließtext', groesse: 22, gewicht: 400, farbe: '#2E3440', zeile: 1.5 },
  klein:     { name: 'Kleiner Hinweistext', groesse: 16, gewicht: 400, farbe: '#6A7181' },
};
export const CI_TEXTFELD = { hg: '#FFFFFF', rand: '#E4E1DA', ecke: 12, innen: 20 }; // ruhige weiße Karte ohne Schatten

export const CI_TIMER = {
  normal:  { hg: '#E3EEF9', text: '#1E3A6E', ring: '#7FA6D6' },
  bald:    { hg: '#FBF3D5', text: '#6B4423', ring: '#EBD9A0' }, // letzte Minute
  vorbei:  { hg: '#F5E1DC', text: '#8A4B3C', ring: '#EBC9BE' },
};

export const CI_BILD = 'Fotorealistisch, keine Comicfiguren. Weißer Rahmen, runde Ecken, sanfter Schatten.';