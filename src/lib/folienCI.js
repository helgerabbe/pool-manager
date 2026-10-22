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
};

export const CI_BILD = 'Fotorealistisch, keine Comicfiguren. Weißer Rahmen, runde Ecken, sanfter Schatten.';