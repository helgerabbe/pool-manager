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
  weiter:  { name: 'Weiter (freigeschaltet)', label: 'Weiter', symbol: 'ArrowRight', hg: '#3E5C8A', text: '#FFFFFF', rand: '#3E5C8A' },
  weiter_gesperrt: { name: 'Weiter (noch gesperrt, wartet auf Lehrkraft)', label: 'Weiter', symbol: 'Lock', hg: '#EEF0F3', text: '#9AA3B2', rand: '#D6DCE5', gesperrt: true },
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

// Teil 4: Folienraster der TAFEL (Lehreransicht, 16:9). Das iPad übernimmt dieselben Zonen (siehe Teil 13). Feste Zonen für Standardelemente; der Rest ist Inhaltsbereich.
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
  GA: { name: 'Gruppenarbeit', symbol: 'Network' },
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

// Organisatorische Tätigkeiten (Ablauf, Wechsel, Kontrolle).
export const CI_ORGANISATION = {
  partner:      { name: 'Partner finden', symbol: 'Handshake' },
  vergleichen:  { name: 'Vergleichen', symbol: 'ArrowLeftRight' },
  kontrollieren:{ name: 'Kontrollieren', symbol: 'CheckCheck' },
  praesentieren:{ name: 'Präsentieren', symbol: 'Megaphone' },
  feedback:     { name: 'Feedback geben', symbol: 'ThumbsUp' },
  festhalten:   { name: 'Ergebnisse festhalten', symbol: 'ClipboardList' },
  abgeben:      { name: 'Abgeben', symbol: 'Send' },
  material:     { name: 'Material holen / aufräumen', symbol: 'Package' },
  wechseln:     { name: 'Platz wechseln', symbol: 'Footprints' },
  warten:       { name: 'Warten / Stillarbeit', symbol: 'Hourglass' },
  abstimmen:    { name: 'Abstimmen', symbol: 'Vote' },
  diskutieren:  { name: 'Diskutieren', symbol: 'MessagesSquare' },
};

// Teil 7: Interaktive Elemente. Alles, was man anfassen kann, ist eine weiße Karte mit Rand;
// Ziehen hebt die Karte an (Schatten 'gehoben'), Ablagefelder sind gestrichelt.
export const CI_INTERAKTIV = {
  karte:     { name: 'Sortier-/Ziehkarte', hg: '#FFFFFF', rand: '#D6DCE5', text: '#2E3440', griff: '#9AA3B2' },
  gezogen:   { name: 'Karte wird gezogen', rand: '#7FA6D6' },
  ablage:    { name: 'Ablagefeld', hg: '#F3F1EC', rand: '#C9C4B8', aktiv: '#E3EEF9' },
  auswahl:   { name: 'Auswahl (Ankreuzen)', hg: '#FFFFFF', rand: '#D6DCE5', gewaehlt_hg: '#E3EEF9', gewaehlt_rand: '#3E5C8A' },
  notiz:     { name: 'Notizzettel / Pinnwand', hg: '#FBF3D5', rand: '#EBD9A0', text: '#6B4423' },
  regler:    { name: 'Regler', spur: '#E4E1DA', fuellung: '#7FA6D6', knopf: '#3E5C8A' },
};

// Teil 8: Rückmeldungen nach „Prüfen“. Ruhig statt knallig: Pastellfläche + Symbol + kurzer Satz.
// Falsch ist nie rot-alarmierend, sondern ein warmes Apricot mit Ermutigung.
export const CI_RUECKMELDUNG = {
  richtig:  { titel: 'Richtig!', symbol: 'CheckCircle2', hg: '#DCEBE1', rand: '#BFDCC9', text: '#24553A', satz: 'Gut gemacht.' },
  teilweise:{ titel: 'Fast!', symbol: 'CircleDot', hg: '#FBF3D5', rand: '#EBD9A0', text: '#6B4423', satz: 'Einiges stimmt schon. Schau dir die markierten Stellen an.' },
  falsch:   { titel: 'Noch nicht', symbol: 'RotateCcw', hg: '#FBEFEA', rand: '#EBC9BE', text: '#8A4B3C', satz: 'Versuch es noch einmal.' },
  loesung:  { titel: 'Lösung', symbol: 'Eye', hg: '#E3EEF9', rand: '#B9D2EE', text: '#1E3A6E', satz: 'So sieht eine mögliche Lösung aus.' },
};
// Hilfen: Tippkarte (gestuft, aufklappbar) und KI-Tutor (Lernunterstützung, gibt keine Lösungen vor).
export const CI_HILFEN = {
  tipp:  { titel: 'Tipp', symbol: 'Lightbulb', hg: '#FFF8E6', rand: '#EBD9A0', text: '#6B4423', knopf: 'Tipp anzeigen', stufen: 'Tipp 1 → Tipp 2 → Lösungsweg (je ein Klick)' },
  tutor: { titel: 'KI-Tutor', symbol: 'Bot', hg: '#E7E4F3', rand: '#D3CDEB', text: '#4A4170', knopf: 'Frag den Tutor', regel: 'Hilft mit Rückfragen und Denkanstößen, verrät keine Lösung. Kann von der Lehrkraft je Folie ein- und ausgeschaltet werden.' },
};

export const CI_RUECKMELDUNG_REGEL = 'Markiert wird am Element selbst (Rand in der Rückmeldefarbe), die Rückmeldebox erscheint unten über der Steuerung. Lösung erst nach zwei Versuchen oder auf Freigabe der Lehrkraft.';

// Teil 9: Ergebnisanzeigen an der Tafel (gesammelte Antworten aller Schüler).
// Anonym als Standard, ruhige Pastellreihe, größter Wert dezent hervorgehoben.
export const CI_ERGEBNIS = {
  reihe: ['#B9D2EE', '#BFDCC9', '#EBD9A0', '#EBC9BE', '#D3CDEB'],
  hervorhebung: '#3E5C8A',
  arten: {
    balken:   { name: 'Abstimmung / Balken', symbol: 'BarChart3' },
    wolke:    { name: 'Wortwolke', symbol: 'Cloud' },
    pinnwand: { name: 'Gesammelte Antworten (Pinnwand)', symbol: 'StickyNote' },
    zaehler:  { name: 'Fortschritt der Klasse („18 von 24 fertig“)', symbol: 'Users' },
  },
  regel: 'Ergebnisse sind anonym, solange die Lehrkraft keine Namen einblendet. Anzeige erst, wenn die Lehrkraft sie aufdeckt.',
};

// Teil 10: Zustände auf dem Schülergerät. Immer gleiche Karte mittig, Symbol + ein Satz.
export const CI_ZUSTAENDE = {
  warten:     { titel: 'Warte auf die Lehrkraft', satz: 'Gleich geht es weiter.', symbol: 'Hourglass', hg: '#E3EEF9', text: '#1E3A6E' },
  gesperrt:   { titel: 'Noch gesperrt', satz: 'Diese Folie wird gleich freigeschaltet.', symbol: 'Lock', hg: '#E7E4F3', text: '#4A4170' },
  abgegeben:  { titel: 'Abgegeben', satz: 'Deine Antwort ist angekommen.', symbol: 'CheckCircle2', hg: '#DCEBE1', text: '#24553A' },
  verbindung: { titel: 'Verbindung schwach', satz: 'Deine Eingaben werden gespeichert und später gesendet.', symbol: 'WifiOff', hg: '#FBF3D5', text: '#6B4423' },
};

// Teil 11: Schwierigkeit von Aufgaben. Vier Stufen, als kleines Abzeichen neben der Aufgaben-Überschrift.
export const CI_NIVEAU = {
  alle:    { name: 'Für alle', beschreibung: 'Pflichtaufgabe ohne Stufe, alle bearbeiten sie', symbol: 'Users', anzahl: 1, hg: '#E3EEF9', text: '#1E3A6E' },
  bruecke: { name: 'Brücke', beschreibung: 'Mit besonderer Unterstützung (z. B. Förderbedarf)', symbol: 'Milestone', anzahl: 1, hg: '#E6F2EA', text: '#24553A' },
  stern1:  { name: '1 Stern', beschreibung: 'Grundlegend', symbol: 'Star', anzahl: 1, hg: '#FBF3D5', text: '#6B4423' },
  stern2:  { name: '2 Sterne', beschreibung: 'Weiterführend', symbol: 'Star', anzahl: 2, hg: '#FBF3D5', text: '#6B4423' },
  rakete:  { name: 'Rakete', beschreibung: 'Knobelaufgabe für Schnelle', symbol: 'Rocket', anzahl: 1, hg: '#E7E4F3', text: '#4A4170' },
};

// Methodenanzeige: kein eigenes Symbol je Methode, nur der Name als ruhiges Schild rechts in der Kopfleiste.
export const CI_METHODE_ANZEIGE = { hg: '#E7E4F3', text: '#4A4170', beispiel: 'Think-Pair-Share', schritt: 'Pair' };

// Teil 12: Gruppenkennung. Feste Pastellfarbe + Buchstabe; erscheint auf dem Schülergerät und an der Tafel.
export const CI_GRUPPEN = [
  { kennung: 'A', name: 'Gruppe A', hg: '#E3EEF9', text: '#1E3A6E' },
  { kennung: 'B', name: 'Gruppe B', hg: '#DCEBE1', text: '#24553A' },
  { kennung: 'C', name: 'Gruppe C', hg: '#FBF3D5', text: '#6B4423' },
  { kennung: 'D', name: 'Gruppe D', hg: '#F5E1DC', text: '#8A4B3C' },
  { kennung: 'E', name: 'Gruppe E', hg: '#E7E4F3', text: '#4A4170' },
  { kennung: 'F', name: 'Gruppe F', hg: '#D9EEEC', text: '#1F5550' },
];
export const CI_GRUPPEN_REGEL = 'Die Kennung steht in der Ecke rechts oben neben dem Sozialform-Symbol. Gruppenmitglieder sehen dieselbe Farbe, an der Tafel werden Ergebnisse in der Gruppenfarbe gezeigt.';

// Teil 5b: Medien. Ein Rahmen für alles Sichtbare (Bild, Grafik, Video, Animation), keine Farbcodes.
// Unterschieden wird nur durch ein kleines Zeichen, wo man etwas tun kann.
export const CI_MEDIEN = {
  bild:       { name: 'Bild / Grafik', zeichen: null },
  video:      { name: 'Video', zeichen: 'Play', ort: 'mittig' },
  animation:  { name: 'Interaktive Animation', zeichen: 'Hand', ort: 'Ecke rechts unten' },
  audio:      { name: 'Audio', zeichen: 'Headphones', ort: 'eigene Abspielleiste statt Rahmen' },
};
export const CI_MEDIEN_REGEL = 'Gleicher weißer Rahmen, runde Ecken, sanfter Schatten, graue Unterschrift. Keine Rahmenfarben je Inhalt. Audio bekommt eine schmale Abspielleiste.';

// Teil 13: Schülergerät = iPad 11" (ca. 29 cm). Querformat 1180×820 pt, Hochformat 820×1180 pt (Seitenverhältnis ca. 1,44).
// Bedienung nach iPadOS-Gewohnheit: kein Burger-Menü, sondern Navigationsleiste oben, große Tippflächen, Wischgesten.
export const CI_TABLET = {
  quer: { breite: 1180, hoehe: 820 },
  hoch: { breite: 820, hoehe: 1180 },
  statusleiste: 24,       // Uhrzeit/Akku des Systems, frei lassen
  navleiste: 50,          // ‹ Zurück links · Titel mittig · Aktionen rechts
  homeleiste: 20,         // Wischbalken unten, frei lassen
  tippflaeche: 44,        // Mindestgröße jedes Bedienelements
  rand: 20,
  regeln: [
    'Gleiche Logik wie das Tafelraster (Teil 4): Die Navigationsleiste ersetzt die Kopfleiste; Logo, Fach und Einheit entfallen.',
    'Oben eine Navigationsleiste: links „‹ Zurück“, mittig das Methodenschild (Methode · Schritt), rechts höchstens zwei Symbole (Tipp, Tutor).',
    'Ecke rechts oben (unter der Leiste): Timer, Sozialform-Symbol, Gruppenkennung – wie an der Tafel.',
    'Ecke rechts unten: Steuerung (Prüfen, Fertig, Weiter) – wie an der Tafel, gut mit dem Daumen erreichbar.',
    'Hochformat: Die Ecken werden zu einer schmalen Leiste oben (Timer, Gruppe) und einer Leiste unten (Steuerung).',
    'Kein Burger-Menü: Es gibt nur einen Weg nach vorn und zurück, Inhalte liegen nicht in versteckten Menüs.',
    'Umschalten zwischen Ansichten mit einem Segment-Schalter (z. B. „Aufgabe | Material“), wie in Apple-Apps.',
    'Wischen vom linken Rand = zurück. Weiter nur über den Weiter-Knopf (Lehrkraft führt).',
    'Zusatzinhalte (Tipp, Tutor) öffnen als Blatt von unten, nicht als neue Seite.',
    'Jedes Bedienelement mindestens 44 × 44 pt groß; nichts liegt auf dem Home-Balken.',
    'Im Hochformat stapeln sich die Inhalte untereinander.',
  ],
};

export const CI_BILD = 'Fotorealistisch, keine Comicfiguren. Weißer Rahmen, runde Ecken, sanfter Schatten.';