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
  inhalt: { name: 'Inhaltsfolie', farbe: '#D9EEEC' },            // Inhalt präsentieren/erklären: Impuls, Grafik (auch sich verändernd), Erklärung
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

// Teil 4: Folienraster. Feste Zonen für Standardelemente; der Rest ist Inhaltsbereich.
// Angaben in Prozent der Folie (16:9). Zonen bleiben klein, damit Inhalte Platz haben.
export const CI_RASTER = {
  kopf:  { name: 'Kopfleiste', hoehe: 6, inhalt: 'Logo (klein, links) · Fach · Einheit · Stunde (klein, grau)' },
  logo:  { url: 'https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/88cea1b76_PoolManagerLogo.jpg', hoehe: 70 }, // Höhe in % der Kopfleiste
  oben:  { name: 'Ecke rechts oben', breite: 18, hoehe: 12, inhalt: 'Timer, Sozialform-Symbol' },
  unten: { name: 'Ecke rechts unten', breite: 30, hoehe: 12, inhalt: 'Steuerung: Prüfen, Fertig, Zurück …' },
};

// Welche Zonen je Folientyp belegt sind (frei = gehört dem Inhalt).
export const CI_ZONEN_JE_TYP = {
  inhalt:       { oben: false, unten: true },
  methode:      { oben: false, unten: false },
  aufgabe:      { oben: true,  unten: true },
  organisation: { oben: true,  unten: true },
  sicherung:    { oben: false, unten: true },
  reflexion:    { oben: true,  unten: true },
};

// Wer steuert? Grundregel "Lehrkraft führt": Schüler dürfen jederzeit zurück,
// aber nur bis zu der Folie bzw. dem Schritt vor, den die Lehrkraft schon erreicht hat.
export const CI_STEUERUNG = {
  regel: 'Lehrkraft führt',
  lehrkraft: 'Schaltet Folien und Schritte frei (Weiter).',
  schueler_zurueck: 'Immer erlaubt.',
  schueler_vor: 'Nur bis zum Stand der Lehrkraft.',
};

// Teil 5: Bildrahmen, Abstände, Schatten (Werte in px bei 1280×720).
export const CI_BILDRAHMEN = { rand: 6, randfarbe: '#FFFFFF', ecke: 12, unterschrift: { groesse: 14, farbe: '#6A7181' } };
export const CI_ABSTAND = { folienrand: 40, zwischen_bloecken: 24, innen: 20, eng: 8 }; // 8er-Raster
export const CI_SCHATTEN = {
  keiner: 'none',                                  // Textfelder, Boxen
  sanft: '0 4px 14px rgba(46,52,64,0.10)',         // Bilder, Karten
  gehoben: '0 8px 24px rgba(46,52,64,0.16)',       // nur aktive/gezogene Elemente
};

// Teil 6: Symbole (lucide-Namen). Immer gleiche Form: runder Pastell-Kreis, Symbol in Akzentfarbe.
export const CI_SYMBOL_STIL = { hg: '#E3EEF9', farbe: '#1E3A6E', groesse: 40 };
export const CI_SOZIALFORM = {
  EA: { name: 'Einzelarbeit', symbol: 'User' },
  PA: { name: 'Partnerarbeit', symbol: 'Users' },
  GA: { name: 'Gruppenarbeit', symbol: 'UsersRound' },
  PL: { name: 'Plenum', symbol: 'Presentation' },
};
export const CI_TAETIGKEIT = {
  lesen:     { name: 'Lesen', symbol: 'BookOpen' },
  schreiben: { name: 'Schreiben', symbol: 'PenLine' },
  sprechen:  { name: 'Sprechen / Austauschen', symbol: 'MessageCircle' },
  zuhoeren:  { name: 'Zuhören', symbol: 'Ear' },
  ansehen:   { name: 'Ansehen (Video/Bild)', symbol: 'Eye' },
  denken:    { name: 'Nachdenken', symbol: 'Brain' },
  melden:    { name: 'Melden', symbol: 'Hand' },
  zeichnen:  { name: 'Zeichnen / Skizzieren', symbol: 'Pencil' },
  rechnen:   { name: 'Rechnen', symbol: 'Calculator' },
  recherche: { name: 'Recherchieren', symbol: 'Search' },
  geraet:    { name: 'Am Gerät arbeiten', symbol: 'Tablet' },
  heft:      { name: 'Im Heft arbeiten', symbol: 'Notebook' },
};

export const CI_BILD = 'Fotorealistisch, keine Comicfiguren. Weißer Rahmen, runde Ecken, sanfter Schatten.';