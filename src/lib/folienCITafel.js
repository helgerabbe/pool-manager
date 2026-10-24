// Teil 17 (2026-10-24): Elemente der Funktionstafel (Lehrkraft-Tafel in Arbeitsphasen).
// Jedes Element, das auf einer Standardfolie (Meso-Ebene) vorkommt, ist hier als Layoutvorlage (Mikro-Ebene) definiert.
export const CI_TAFEL_ELEMENTE = [
  { typ: 'burgermenue', name: 'Burgermenü (Anzeigen an/aus)', regel: 'Oben links: runder weißer Knopf mit dünnem grauem Rand und drei Strichen. Öffnet ein weißes Popup mit Überschrift „Auf der Tafel zeigen“ und je Zeile Name + Schalter.' },
  { typ: 'schalter', name: 'Schalter', regel: 'Kleiner runder Kippschalter: aus = grau (#E4E1DA), an = Dunkelblau (#2A4074). Rechts neben der Beschriftung.' },
  { typ: 'aktionsknopf', name: 'Aktionsknopf (Pille)', regel: 'Weiße Pille mit dünnem grauem Rand, links kleines Symbol, kurzer Text (max. 2 Wörter). Nebeneinander in einer Reihe oben, Hover = hellblaue Fläche (#E3EEF9).' },
  { typ: 'symbolknopf', name: 'Runder Symbolknopf', regel: 'Pastellkreis (#E3EEF9) mit dunkelblauem Symbol, ohne Text; Erklärung nur als Tooltip. Beispiel: Lautstärke umschalten.' },
  { typ: 'warteliste', name: 'Liste untereinander (Warteschlange)', regel: 'Weiße Karte mit fetter Überschrift und Symbol. Einträge als nummerierte Zeilen in zartem Apricot (#F6E3DD), rechts Haken zum Abhaken. Leer = grauer Satz „Niemand wartet.“' },
  { typ: 'stimmungsbalken', name: 'Geteilter Balken (Stimmung)', regel: 'Weiße Karte mit Frage als Überschrift. Ein durchgehender Balken in Segmenten Grün (#7FB08A) / Sand (#E6CF8E) / Rosé (#E39A8A), darunter die Zahlen je Segment in Grau.' },
  { typ: 'regler', name: 'Regler / Lärmampel', regel: 'Weiße Karte: oben links fette Beschriftung, oben rechts der Zustand in Ampelfarbe. Darunter der Regler über die volle Breite mit Verlauf Grün → Gelb → Rot. Nie Beschriftung und Regler in eine Zeile quetschen.' },
  { typ: 'timer_gross', name: 'Großer Ring-Timer', regel: 'Kreisring in Hellblau (#7FA6D6), Zahl groß und fett dunkelblau in der Mitte, rechts auf der Tafel. Darunter klein der Fortschritt („2 von 6 fertig“).' },
  { typ: 'zaehler', name: 'Zähler-Pille', regel: 'Weiße Pille mit Symbol und Zahl, z. B. Stern + „0 / 10 Sterne“ (Klassenziel).' },
  { typ: 'teamkachel', name: 'Team-Kachel mit Fortschritt', regel: 'Weiße Karte je Paar/Gruppe (bei Gruppen in Gruppenfarbe): Symbol + Nummer, dünner Fortschrittsbalken (#7FA6D6 auf #E4E1DA), fertig = grüner Haken, Hinweis „kann helfen“ in Grün. Unten zwei kleine Knöpfe: Stern (Apricot) und Leise-Hinweis (Grün). Kacheln in einer Reihe am unteren Rand.' },
  { typ: 'vollbildhinweis', name: 'Vollbild-Hinweis (Aktion läuft)', regel: 'Deckt die ganze Tafel in Dunkelblau (#2A4074, leicht transparent): großes Symbol, Titel, ein Satz, weißer Knopf zum Beenden.' },
  { typ: 'miniatur', name: 'Miniatur mit Vergrößern', regel: 'Große Ansichten werden als verkleinerte Miniatur gezeigt; unten rechts weiße Pille „Vergrößern“. Klick öffnet die bedienbare Großansicht.' },
];

export const tafelElementeText = () => CI_TAFEL_ELEMENTE.map((e) => `${e.name}: ${e.regel}`).join('\n');