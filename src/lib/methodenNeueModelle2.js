// Passung für die neuen Stundentypen (2026-10-17), Teil 2: Einstieg & Aktivierung, Methoden 11–20.
// Format wie methodenNeueModelle1.js: [passung, 'Phase:beitrag|…', Hinweis, [[wert, Hinweis] je Variante]].
export const NEUE_DATEN_2 = {
  'Zwillingsfindung': {
    praesentation: [3, 'Ablauf & Kriterien:teil', 'Bildet Gruppen für Austauschrunden.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [2, 'Bildet die Austauschpaare.'], [5, 'Passt nicht.']]],
    einstieg: [3, 'Vorwissen & Fragen:teil', 'Begriffspaare aktivieren Vorwissen und bilden Gruppen.', [[4, 'Kaum Bezug.'], [2, 'Begriffspaare zeigen Vorwissen.'], [3, 'Paare als Vorschau auf Begriffe.'], [3, 'Gruppen für Schwerpunkte.']]],
    gestaltung: [4, 'Ideen & Planung:bedingt', 'Nur zur Gruppenbildung.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Paare für Szenen.'], [3, 'Teams für Produkte.']]],
    erschliessung: [4, '', 'Höchstens zum Sichern von Fachbegriffen.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Paare aus beiden Gegenständen.'], [4, 'Kaum Bezug.']]],
    urteil: [4, 'Erste Positionen:bedingt', 'Höchstens zum Bilden von Pro- und Contra-Paaren.', [[4, 'Kaum Bezug.'], [3, 'Argument und Gegenargument als Paar.'], [3, 'Paare für Rollen.'], [4, 'Kaum Bezug.']]],
  },
  'Kopfstand-Frage': {
    praesentation: [3, 'Ablauf & Kriterien:teil', '„Wie präsentiert man richtig schlecht?“ liefert Feedback-Kriterien.', [[2, 'Kriterien über das Gegenteil.'], [3, 'Kriterien für Plakate.'], [3, 'Kriterien für Kurzvorträge.'], [2, 'Bewertungskriterien finden.']]],
    einstieg: [2, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Ungewohnter Zugang, der Vorwissen spielerisch zeigt.', [[2, 'Umgedrehtes Problem.'], [2, 'Vorwissen über das Gegenteil.'], [4, 'Kaum Überblick.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [1, 'Auftrag & Kriterien:kern|Ideen & Planung:teil', 'Klassischer Weg zu Gestaltungskriterien: Was macht ein Produkt schlecht?', [[1, 'Schreibkriterien über das Gegenteil.'], [2, 'Bildkriterien.'], [2, 'Kriterien für Auftritte.'], [1, 'Kriterien für Videos.']]],
    erschliessung: [4, '', 'Kaum Bezug zur Deutung.', [[4, 'Kaum Bezug.'], [3, 'Wie manipuliert man mit einer Quelle?'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Anlass für ein Gegenprodukt.']]],
    urteil: [3, 'Auseinandersetzung mit Argumenten:teil', 'Schwache Argumente zeigen, was ein gutes ausmacht.', [[3, 'Was ist eine schlechte Begründung?'], [2, 'Kriterien für starke Argumente.'], [3, 'Was macht eine Debatte schlecht?'], [3, 'Folgen schlechter Entscheidungen.']]],
  },
  'Brain Dump': {
    praesentation: [4, 'Reflexion:bedingt', 'Höchstens: Was habe ich behalten?', [[3, 'Was ist hängen geblieben?'], [3, 'Nach dem Rundgang.'], [3, 'Nach den Runden.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Vorwissen & Fragen:kern', 'Schneller, ehrlicher Blick auf das Vorwissen.', [[4, 'Kaum Bezug zum Problem.'], [1, 'Das ist genau diese Form.'], [3, 'Vor dem Überblick.'], [3, 'Grundlage für Schwerpunkte.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Alles aufschreiben, was einem zum Thema einfällt.', [[2, 'Material fürs Schreiben.'], [3, 'Ideen fürs Bild.'], [3, 'Ideen für Szenen.'], [3, 'Inhalte fürs Produkt.']]],
    erschliessung: [3, 'Erste Eindrücke & Fragen:teil', 'Erste Eindrücke ungefiltert festhalten.', [[2, 'Nach dem ersten Lesen.'], [3, 'Kontextwissen sammeln.'], [3, 'Wahrnehmungen festhalten.'], [3, 'Zu jedem Gegenstand.'], [3, 'Material fürs Produkt.']]],
    urteil: [3, 'Erste Positionen:teil', 'Erste Gedanken zur Frage ungefiltert notieren.', [[2, 'Erste Gedanken zur Haltung.'], [3, 'Rohmaterial für Argumente.'], [3, 'Vorbereitung der Rolle.'], [3, 'Erste Ideen zum Fall.']]],
  },
  'Satz / Zahl des Tages': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [2, 'Impuls & Neugier:kern', 'Ein rätselhafter Satz oder eine Zahl als Auftakt.', [[2, 'Irritierende Zahl.'], [3, 'Erinnern an Bekanntes.'], [4, 'Kaum Überblick.'], [4, 'Kaum Bezug.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Ein Satz als Schreibanlass.', [[2, 'Satz als Schreibanlass.'], [3, 'Satz als Bildidee.'], [3, 'Satz als Szenenanlass.'], [4, 'Kaum Bezug.']]],
    erschliessung: [2, 'Erstbegegnung:teil|Erste Eindrücke & Fragen:teil', 'Ein Schlüsselsatz aus dem Text als Einstieg.', [[1, 'Schlüsselsatz des Textes.'], [2, 'Zitat aus der Quelle.'], [3, 'Titel oder Zitat zum Werk.'], [3, 'Je ein Satz aus beiden.'], [3, 'Satz als Ausgangspunkt.']]],
    urteil: [2, 'Streitfrage aufwerfen:kern', 'Ein Zitat oder eine Zahl stößt die Streitfrage an.', [[2, 'Zitat zur Stellungnahme.'], [3, 'Zahl als Ausgangspunkt.'], [3, 'Zitat als Streitanlass.'], [2, 'Zahl eröffnet den Fall.']]],
  },
  'Odd One Out': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [2, 'Impuls & Neugier:teil|Vorwissen & Fragen:kern', 'Begründetes Aussortieren zeigt Vorwissen und Begriffe.', [[3, 'Kann irritieren.'], [1, 'Vorwissen beim Begründen.'], [4, 'Kaum Überblick.'], [4, 'Kaum Bezug.']]],
    gestaltung: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    erschliessung: [3, 'Genaue Arbeit am Gegenstand:teil', 'Welches Motiv oder Merkmal passt nicht? Schärft den Blick.', [[3, 'Welches Motiv passt nicht?'], [3, 'Welche Aussage fällt heraus?'], [3, 'Welches Merkmal fällt heraus?'], [2, 'Werke vergleichen.'], [4, 'Kaum Bezug.']]],
    urteil: [4, 'Auseinandersetzung mit Argumenten:bedingt', 'Höchstens: Welches Argument passt nicht?', [[4, 'Kaum Bezug.'], [3, 'Welches Argument ist schwach?'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
  },
  'Zwei Wahrheiten, eine Lüge': {
    praesentation: [3, 'Rückmeldung:teil', 'Zuhörer prüfen, ob sie die Kernaussagen behalten haben.', [[3, 'Verständnis nach dem Vortrag.'], [3, 'Fragen zum Plakat.'], [2, 'Spielerisch in Kleingruppen.'], [4, 'Kaum Bezug.']]],
    einstieg: [2, 'Impuls & Neugier:teil|Vorwissen & Fragen:kern', 'Spielerischer Auftakt mit überraschenden Fakten zum Thema.', [[2, 'Überraschende Fakten.'], [2, 'Zeigt Vorwissen.'], [3, 'Fakten als Vorschau.'], [4, 'Kaum Bezug.']]],
    gestaltung: [4, '', 'Kaum Bezug.', [[3, 'Als kleine Schreibübung.'], [5, 'Passt nicht.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    erschliessung: [3, 'Deutung sichern:teil', 'Welche Aussage über den Text stimmt nicht? Sichert das Verständnis.', [[3, 'Aussagen zum Text prüfen.'], [2, 'Aussagen der Quelle prüfen.'], [3, 'Aussagen zum Werk.'], [3, 'Zum Vergleich.'], [4, 'Kaum Bezug.']]],
    urteil: [4, '', 'Kaum Bezug, es gibt hier kein Richtig oder Falsch.', [[4, 'Kaum Bezug.'], [3, 'Fakten zum Fall prüfen.'], [4, 'Kaum Bezug.'], [3, 'Faktenlage klären.']]],
  },
  'Der Alien-Brief': {
    praesentation: [4, '', 'Kaum Bezug.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Vorwissen & Fragen:kern', 'Einem Außerirdischen das Thema erklären: weckt Neugier und zeigt Vorwissen.', [[2, 'Fremder Blick auf das Problem.'], [1, 'Vorwissen erklären müssen.'], [3, 'Fragen des Aliens als Leitfragen.'], [2, 'Fragen für die Planung.']]],
    gestaltung: [2, 'Ideen & Planung:teil|Gestalten:teil', 'Ein ungewöhnlicher Schreibanlass mit klarer Adressatin.', [[1, 'Adressatenbezogenes Schreiben.'], [4, 'Kaum Bezug.'], [3, 'Als Szene spielbar.'], [3, 'Als Erklärvideo für Aliens.']]],
    erschliessung: [3, 'Erste Eindrücke & Fragen:teil', 'Dem Alien den Text oder das Werk erklären.', [[3, 'Inhalt erklären.'], [3, 'Was ist das für eine Quelle?'], [3, 'Das Werk beschreiben.'], [4, 'Kaum Bezug.'], [2, 'Produktiver Zugang.']]],
    urteil: [3, 'Streitfrage aufwerfen:teil', 'Der fremde Blick macht Selbstverständliches strittig.', [[3, 'Eigene Haltung erklären.'], [3, 'Beide Seiten erklären.'], [4, 'Kaum Bezug.'], [3, 'Fall von außen sehen.']]],
  },
  'Bildervergleich': {
    praesentation: [4, '', 'Kaum Bezug.', [[4, 'Kaum Bezug.'], [3, 'Ausgestellte Produkte vergleichen.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    einstieg: [2, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Zwei Bilder im Kontrast werfen Fragen zum Thema auf.', [[1, 'Kontrast erzeugt das Problem.'], [3, 'Vorwissen beim Deuten.'], [4, 'Kaum Überblick.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Vorbilder vergleichen und Gestaltungsideen gewinnen.', [[4, 'Kaum Bezug.'], [2, 'Vorbilder vergleichen.'], [4, 'Kaum Bezug.'], [3, 'Bildsprache vergleichen.']]],
    erschliessung: [1, 'Erstbegegnung:teil|Genaue Arbeit am Gegenstand:kern', 'Kern der vergleichenden und werkerschließenden Form.', [[4, 'Kaum Bezug, wenn kein Bild.'], [2, 'Bildquellen vergleichen.'], [1, 'Werke genau vergleichen.'], [1, 'Das ist genau diese Form.'], [3, 'Ausgangspunkt fürs Produkt.']]],
    urteil: [3, 'Streitfrage aufwerfen:teil', 'Zwei Bilder können zwei Positionen verkörpern.', [[3, 'Welches Bild überzeugt?'], [3, 'Zwei Seiten im Bild.'], [3, 'Bilder als Lager.'], [3, 'Zwei Situationen im Fall.']]],
  },
  'Concept Cartoons': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Vorwissen & Fragen:kern', 'Verschiedene Meinungen zu einem Phänomen zeigen Vorstellungen der Klasse.', [[1, 'Strittiges Phänomen.'], [1, 'Vorstellungen werden sichtbar.'], [4, 'Kaum Überblick.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [4, '', 'Höchstens als eigener Cartoon zum Thema.', [[4, 'Kaum Bezug.'], [3, 'Eigenen Cartoon zeichnen.'], [4, 'Kaum Bezug.'], [3, 'Als Comic umsetzen.']]],
    erschliessung: [3, 'Deutungshypothesen:teil', 'Figuren vertreten verschiedene Deutungen.', [[2, 'Deutungen als Sprechblasen.'], [3, 'Lesarten der Quelle.'], [3, 'Deutungen zum Werk.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    urteil: [2, 'Streitfrage aufwerfen:kern|Erste Positionen:teil', 'Die Figuren zeigen mögliche Positionen zur Frage.', [[1, 'Welcher Figur stimmst du zu?'], [2, 'Positionen vergleichen.'], [3, 'Figuren als Rollen.'], [3, 'Optionen im Fall.']]],
  },
  'Soziogramm / Aufstellung im Raum': {
    praesentation: [4, 'Rückmeldung:bedingt', 'Höchstens als schnelles Stimmungsbild.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    einstieg: [2, 'Vorwissen & Fragen:teil', 'Zeigt Vorerfahrungen und Bezüge der Klasse zum Thema.', [[3, 'Aufstellung zum Problem.'], [2, 'Vorerfahrung sichtbar.'], [4, 'Kaum Überblick.'], [2, 'Interessen sichtbar.']]],
    gestaltung: [4, '', 'Höchstens als Figurenkonstellation im darstellenden Spiel.', [[4, 'Kaum Bezug.'], [5, 'Passt nicht.'], [2, 'Figuren im Raum stellen.'], [5, 'Passt nicht.']]],
    erschliessung: [3, 'Genaue Arbeit am Gegenstand:teil', 'Figurenbeziehungen im Raum sichtbar machen.', [[2, 'Figurenkonstellation stellen.'], [3, 'Beteiligte der Quelle stellen.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [2, 'Szenisch deuten.']]],
    urteil: [2, 'Erste Positionen:kern|Sichern & reflektieren:teil', 'Positionen im Raum, vorher und nachher.', [[1, 'Haltung im Raum zeigen.'], [2, 'Vorher-Nachher.'], [3, 'Lager aufstellen.'], [3, 'Entscheidung sichtbar.']]],
  },
};