// Teil 14: Standard-Aussehen der Elemente im Folien-Designer (Stand 2026-10-23).
// Grundsatz: dünne Außenlinie (2px) in einem dunkleren Ton der Füllfarbe, Pastellfüllung, runde Ecken 12px, kein Schatten.

export const CI_FORMEN = {
  linie: 2,
  ecke: 12,
  fuellung: '#E3EEF9',
  rand: '#7FA6D6',
  regel: 'Formen (Rechteck, Ellipse, Dreieck, Freihand, breiter Pfeil): Pastellfüllung mit dünner 2px-Außenlinie im dunkleren Ton derselben Farbe. Linien und dünne Pfeile: 2px in Anthrazit #2E3440, runde Enden, kleine geschlossene Spitze. Der breite Pfeil hat eine kurze, breite Spitze und ist nie schraffiert.',
};

export const CI_ELEMENTE = [
  { typ: 'karteikarte', name: 'Karteikarte', regel: 'Vorderseite weiße Karte, Rückseite hellgelb (#FBF3D5). Kleines Drehsymbol unten rechts. Antippen dreht die Karte um die senkrechte Achse.' },
  { typ: 'foto', name: 'Foto hochladen', regel: 'Gestrichelte Ablagefläche (#C9C4B8) mit Kamera-Symbol und „Foto aufnehmen“. Nach dem Upload erscheint das Bild im normalen weißen Bildrahmen mit kleinem „Neu“-Knopf.' },
  { typ: 'skala', name: 'Skala / Positionieren', regel: 'Graue Spur (#E4E1DA), Endpunkte beschriftet. Die eigene Markierung ist ein dunkelblauer Punkt, andere Schüler (an der Tafel) als kleine hellblaue Punkte.' },
  { typ: 'kanban', name: 'Kanban-Board', regel: 'Spalten als hellgraue Flächen (#F3F1EC) mit Überschrift oben. Karten sind weiße Ziehkarten. Spaltenzahl 2 bis 4.' },
  { typ: 'reihenfolge', name: 'Reihenfolge', regel: 'Weiße Karten untereinander, links ein Griff (⋮⋮) und eine kleine Nummer im Pastellkreis. Beim Ziehen hebt sich die Karte an.' },
  { typ: 'auswahl', name: 'Auswahl', regel: 'Weiße Antwortkarten; gewählt = hellblaue Fläche + dunkelblauer Rand. Kreis = eine Antwort, Kästchen = mehrere.' },
  { typ: 'tabelle', name: 'Tabelle', regel: 'Kopfzeile hellblau (#E3EEF9), Zellen weiß, feine Linien (#E4E1DA), keine Außenschatten.' },
  { typ: 'raster', name: 'Raster / Aufdeckfelder', regel: 'Verdeckte Felder in Pastellfarbe mit Zahl, aufgedeckt weiß mit Inhalt.' },
  { typ: 'legeboard', name: 'Legeboard', regel: 'Weiße Karten, Verbindungen als 2px-Linien in Dunkelblau mit kleinem Punkt an den Enden.' },
  { typ: 'eingabe', name: 'Eingabefelder', regel: 'Wie Teil 2: weißes Feld, grauer Rand, im Fokus hellblauer Schein.' },
  { typ: 'pinnwand', name: 'Pinnwand / Wortwolke / Abstimmung', regel: 'Wie Teil 9: Notizzettel hellgelb, Pastellreihe, anonym.' },
  { typ: 'knopf', name: 'Knopf, Melden, Audioaufnahme', regel: 'Wie Teil 2: runde Pastellknöpfe mit Symbol. Aufnahme läuft = warmes Apricot mit pulsierendem Punkt.' },
];