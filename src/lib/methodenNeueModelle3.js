// Passung für die neuen Stundentypen (2026-10-17), Teil 3: Einstieg & Aktivierung, Methoden 21–30.
// Format wie methodenNeueModelle1.js: [passung, 'Phase:beitrag|…', Hinweis, [[wert, Hinweis] je Variante]].
export const NEUE_DATEN_3 = {
  'Blitzlicht': {
    praesentation: [2, 'Rückmeldung:teil|Reflexion:kern', 'Jeder sagt kurz, was ihn überzeugt hat oder was er mitnimmt.', [[2, 'Kurzes Feedback nach Vorträgen.'], [3, 'Eindruck vom Rundgang.'], [2, 'Abschluss der Austauschrunden.'], [4, 'Ersetzt kein Raster.']]],
    einstieg: [2, 'Vorwissen & Fragen:teil|Ausblick:teil', 'Schneller Stand der Klasse zu Beginn oder Ausblick am Ende.', [[3, 'Erste Reaktion aufs Problem.'], [2, 'Vorwissen reihum.'], [3, 'Erwartungen an die Einheit.'], [2, 'Wünsche reihum.']]],
    gestaltung: [3, 'Rückmeldung & Überarbeitung:teil', 'Kurzer Zwischenstand: Wo stehe ich mit meinem Produkt?', [[3, 'Zwischenstand beim Schreiben.'], [3, 'Zwischenstand beim Bild.'], [3, 'Eindruck nach der Probe.'], [3, 'Zwischenstand im Projekt.']]],
    erschliessung: [2, 'Erste Eindrücke & Fragen:kern', 'Jeder nennt reihum seinen ersten Eindruck.', [[2, 'Erster Leseeindruck.'], [3, 'Erste Einschätzung der Quelle.'], [1, 'Wirkung des Werks reihum.'], [3, 'Welches spricht dich mehr an?'], [3, 'Kaum Bezug zum Produkt.']]],
    urteil: [2, 'Erste Positionen:teil|Sichern & reflektieren:kern', 'Reihum die eigene Haltung, vorher und nachher.', [[1, 'Haltung in einem Satz.'], [2, 'Hat sich meine Sicht verändert?'], [3, 'Nach der Debatte.'], [2, 'Entscheidung reihum.']]],
  },
  'Think-Pair-Share': {
    praesentation: [3, 'Rückmeldung:teil', 'Feedback erst allein überlegen, dann abstimmen und geben.', [[3, 'Feedback vorbereiten.'], [3, 'Kommentare abstimmen.'], [2, 'Struktur der Runden.'], [3, 'Bewertung abgleichen.']]],
    einstieg: [2, 'Vorwissen & Fragen:kern', 'Jeder aktiviert erst allein sein Vorwissen, dann wird gebündelt.', [[2, 'Erste Lösungsideen.'], [1, 'Vorwissen in drei Stufen.'], [4, 'Kaum Überblick.'], [2, 'Fragen gemeinsam auswählen.']]],
    gestaltung: [2, 'Ideen & Planung:kern|Rückmeldung & Überarbeitung:teil', 'Ideen allein finden, mit dem Partner schärfen.', [[2, 'Schreibideen schärfen.'], [3, 'Bildideen besprechen.'], [3, 'Szenenideen.'], [3, 'Konzept abstimmen.']]],
    erschliessung: [1, 'Erste Eindrücke & Fragen:teil|Deutungshypothesen:kern', 'Eigene Deutung zuerst, dann im Paar am Text prüfen.', [[1, 'Deutung schrittweise schärfen.'], [2, 'Einschätzung der Quelle.'], [2, 'Wirkung besprechen.'], [2, 'Vergleich im Paar.'], [3, 'Produktidee besprechen.']]],
    urteil: [2, 'Erste Positionen:teil|Begründet urteilen:kern', 'Erst eigene Begründung, dann abgleichen und schärfen.', [[1, 'Begründung schärfen.'], [2, 'Argumente gewichten.'], [3, 'Vorbereitung der Debatte.'], [2, 'Entscheidung abstimmen.']]],
  },
  'Demonstration / Experiment vorführen': {
    praesentation: [3, 'Präsentieren:teil', 'Schüler führen ihr Ergebnis vor.', [[2, 'Vortrag mit Vorführung.'], [3, 'Vorführung am Stand.'], [3, 'Vorführung in Runden.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Impuls & Neugier:kern', 'Ein verblüffendes Experiment eröffnet die Einheit.', [[1, 'Phänomen als Problem.'], [3, 'Vorwissen beim Erklären.'], [3, 'Vorschau auf Inhalte.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [3, 'Auftrag & Kriterien:teil', 'Vormachen einer Technik vor dem Gestalten.', [[4, 'Kaum Bezug.'], [2, 'Technik vormachen.'], [3, 'Szene vorspielen.'], [2, 'Werkzeug vorführen.']]],
    erschliessung: [4, 'Erstbegegnung:bedingt', 'Höchstens als Vorspielen eines Werks.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Werk vorführen.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    urteil: [4, 'Streitfrage aufwerfen:bedingt', 'Höchstens als Auslöser einer Frage.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Vorführung als Fall.']]],
  },
  'Mystery / Rätsel': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [2, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Die rätselhafte Leitfrage zieht in die Einheit hinein.', [[1, 'Rätsel als Problem.'], [3, 'Vorwissen beim Verknüpfen.'], [2, 'Karten zeigen Inhalte der Einheit.'], [3, 'Offene Fragen planen.']]],
    gestaltung: [4, '', 'Höchstens als Anlass für eine Geschichte.', [[3, 'Rätsel als Erzählanlass.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    erschliessung: [3, 'Genaue Arbeit am Gegenstand:teil', 'Hinweise aus dem Gegenstand ordnen und verknüpfen.', [[3, 'Textstellen verknüpfen.'], [2, 'Quellenhinweise ordnen.'], [4, 'Kaum Bezug.'], [3, 'Hinweise aus beiden.'], [4, 'Kaum Bezug.']]],
    urteil: [3, 'Auseinandersetzung mit Argumenten:teil', 'Die Lösung muss begründet werden, ist aber meist eindeutig.', [[4, 'Kaum Bezug.'], [3, 'Gründe gewichten.'], [4, 'Kaum Bezug.'], [2, 'Fall als Rätsel.']]],
  },
  'Objekt-Analyse': {
    praesentation: [4, '', 'Kaum Bezug.', [[4, 'Kaum Bezug.'], [3, 'Objekt am Stand erklären.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Vorwissen & Fragen:kern', 'Ein echtes Objekt weckt Neugier und Fragen.', [[1, 'Rätselhaftes Objekt.'], [2, 'Vorwissen beim Beschreiben.'], [3, 'Objekt als Symbol der Einheit.'], [2, 'Fragen ans Objekt.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Objekt als Gestaltungsanlass.', [[2, 'Objekt als Schreibanlass.'], [2, 'Objekt zeichnen.'], [3, 'Requisit für die Szene.'], [3, 'Objekt im Video.']]],
    erschliessung: [1, 'Erstbegegnung:kern|Genaue Arbeit am Gegenstand:kern', 'Beschreiben, deuten, einordnen: genaue Arbeit am Gegenstand.', [[3, 'Nur bei Objekten.'], [1, 'Sachquelle genau untersuchen.'], [1, 'Werk als Objekt.'], [2, 'Zwei Objekte vergleichen.'], [3, 'Anlass fürs Produkt.']]],
    urteil: [4, 'Streitfrage aufwerfen:bedingt', 'Höchstens als Anlass für eine Frage.', [[3, 'Was hältst du davon?'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Objekt als Fall.']]],
  },
  'Partnerinterview': {
    praesentation: [3, 'Rückmeldung:teil|Reflexion:teil', 'Partner befragen sich zu ihrer Präsentation.', [[3, 'Nachgespräch zum Vortrag.'], [3, 'Fragen zum Plakat.'], [2, 'Austausch in Paaren.'], [3, 'Selbsteinschätzung.']]],
    einstieg: [1, 'Vorwissen & Fragen:kern', 'Alle kommen zu Wort und erzählen von ihren Erfahrungen.', [[3, 'Ideen zum Problem.'], [1, 'Vorerfahrung erfragen.'], [4, 'Kaum Überblick.'], [2, 'Interessen erfragen.']]],
    gestaltung: [2, 'Ideen & Planung:teil|Rückmeldung & Überarbeitung:teil', 'Ideen im Gespräch klären oder Feedback erfragen.', [[2, 'Schreibidee erklären.'], [3, 'Bildidee erklären.'], [3, 'Figur befragen.'], [3, 'Konzept erfragen.']]],
    erschliessung: [3, 'Erste Eindrücke & Fragen:teil', 'Eindrücke im Gespräch austauschen.', [[3, 'Leseeindruck erfragen.'], [3, 'Einschätzung erfragen.'], [3, 'Wirkung erfragen.'], [3, 'Vergleich erfragen.'], [2, 'Figur interviewen.']]],
    urteil: [2, 'Erste Positionen:kern', 'Die Haltung des Partners erfragen und verstehen.', [[1, 'Haltung erfragen.'], [2, 'Gründe des anderen.'], [3, 'Vorbereitung der Debatte.'], [3, 'Meinung zum Fall.']]],
  },
  'Placemat': {
    praesentation: [3, 'Ergebnisse bündeln:kern', 'Erkenntnisse aus den Präsentationen bündeln.', [[3, 'Kernaussagen bündeln.'], [3, 'Rundgang auswerten.'], [2, 'Runden zusammenführen.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Vorwissen & Fragen:kern', 'Jeder notiert sein Vorwissen, die Mitte bündelt gemeinsame Fragen.', [[3, 'Lösungsideen sammeln.'], [1, 'Das ist genau diese Form.'], [3, 'Gemeinsame Erwartungen.'], [1, 'Gemeinsame Fragen für die Planung.']]],
    gestaltung: [2, 'Ideen & Planung:kern', 'Ideen einzeln sammeln, gemeinsam auswählen.', [[2, 'Schreibideen.'], [3, 'Bildideen.'], [2, 'Szenenideen.'], [2, 'Konzept im Team.']]],
    erschliessung: [2, 'Erste Eindrücke & Fragen:kern|Deutungshypothesen:teil', 'Eindrücke einzeln, gemeinsame Deutung in der Mitte.', [[2, 'Deutung in der Mitte.'], [3, 'Einschätzung der Quelle.'], [2, 'Wirkung bündeln.'], [3, 'Vergleich bündeln.'], [3, 'Produktideen.']]],
    urteil: [2, 'Auseinandersetzung mit Argumenten:kern', 'Argumente sammeln und die stärksten in der Mitte festhalten.', [[3, 'Gründe sammeln.'], [1, 'Stärkste Argumente in die Mitte.'], [3, 'Argumente für Rollen.'], [2, 'Kriterien der Entscheidung.']]],
  },
  'Ketten-Reaktion (Wurfball)': {
    praesentation: [3, 'Reflexion:teil', 'Reihum per Ball: Was nehme ich mit?', [[3, 'Kurzer Abschluss.'], [3, 'Nach dem Rundgang.'], [3, 'Nach den Runden.'], [4, 'Kaum Bezug.']]],
    einstieg: [2, 'Vorwissen & Fragen:kern', 'Lockerer, bewegter Abruf von Vorwissen.', [[4, 'Kaum Bezug.'], [1, 'Begriffe in der Kette.'], [3, 'Begriffe als Vorschau.'], [3, 'Wünsche reihum.']]],
    gestaltung: [4, 'Ideen & Planung:bedingt', 'Höchstens als Wortkette zum Ideenfinden.', [[3, 'Wortkette fürs Schreiben.'], [4, 'Kaum Bezug.'], [3, 'Aufwärmen fürs Spiel.'], [4, 'Kaum Bezug.']]],
    erschliessung: [3, 'Erste Eindrücke & Fragen:teil', 'Erste Eindrücke reihum, schnell und locker.', [[3, 'Leseeindrücke.'], [4, 'Kaum Bezug.'], [3, 'Wirkung reihum.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.']]],
    urteil: [3, 'Erste Positionen:teil', 'Reihum ein Grund oder eine Haltung.', [[3, 'Haltung reihum.'], [3, 'Argumentkette.'], [3, 'Aufwärmen für die Debatte.'], [4, 'Kaum Bezug.']]],
  },
  'Antizipierendes Lesen': {
    praesentation: [5, '', 'Passt nicht.', [[5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.'], [5, 'Passt nicht.']]],
    einstieg: [2, 'Impuls & Neugier:kern|Vorwissen & Fragen:teil', 'Aus Titel oder Bild vermuten, worum es gehen wird.', [[2, 'Vermutungen erzeugen Spannung.'], [2, 'Vorwissen beim Vermuten.'], [3, 'Vorschau auf das Thema.'], [3, 'Fragen für die Planung.']]],
    gestaltung: [3, 'Ideen & Planung:teil', 'Den Text weiterschreiben oder vorab erfinden.', [[2, 'Vorab erzählen.'], [4, 'Kaum Bezug.'], [3, 'Vermutung als Szene.'], [4, 'Kaum Bezug.']]],
    erschliessung: [1, 'Erstbegegnung:kern|Deutungshypothesen:kern', 'Erwartungen bilden und am Text überprüfen: Kern des Deutens.', [[1, 'Das ist genau diese Form.'], [2, 'Vermutungen zur Quelle.'], [3, 'Vermutungen zum Werk.'], [3, 'Erwartungen vergleichen.'], [2, 'Leerstellen füllen.']]],
    urteil: [4, '', 'Kaum Bezug.', [[4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [3, 'Wie geht der Fall aus?']]],
  },
  'Storyline': {
    praesentation: [3, 'Präsentieren:teil', 'Ergebnisse als Teil der fortlaufenden Geschichte vorstellen.', [[3, 'Episode vortragen.'], [3, 'Story als Ausstellung.'], [3, 'Episoden austauschen.'], [4, 'Kaum Bezug.']]],
    einstieg: [1, 'Impuls & Neugier:kern|Überblick über die Einheit:teil', 'Eine Geschichte trägt die ganze Einheit und weckt Neugier.', [[1, 'Problem in der Geschichte.'], [3, 'Vorwissen der Figuren.'], [1, 'Die Story ist der rote Faden.'], [2, 'Klasse gestaltet die Story mit.']]],
    gestaltung: [1, 'Ideen & Planung:teil|Gestalten:kern', 'Schüler gestalten Figuren, Orte und Episoden selbst.', [[1, 'Episoden schreiben.'], [1, 'Figuren und Orte gestalten.'], [2, 'Szenen spielen.'], [2, 'Story als Video.']]],
    erschliessung: [3, 'Erstbegegnung:teil', 'Gegenstand als Teil der Geschichte einführen.', [[3, 'Text als Fundstück.'], [2, 'Quelle als Fundstück.'], [3, 'Werk in der Story.'], [4, 'Kaum Bezug.'], [2, 'Produktiv weitererzählen.']]],
    urteil: [2, 'Streitfrage aufwerfen:kern', 'Die Figuren stehen vor einer Entscheidung.', [[2, 'Was soll die Figur tun?'], [2, 'Folgen abwägen.'], [3, 'Figuren streiten.'], [1, 'Story als Fall.']]],
  },
};