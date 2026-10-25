// Passung je Variante (2026-10-16), Teil 5: Erarbeitung & Strukturieren, Block 1.
// Reihenfolge der Werte: induktiv offen/gelenkt/gestuft/kompakt, deduktiv darbietend/lösungsbeispiel/material/kompakt,
// vertieft problemlösend/gestaltend/erkundend/perspektivisch, wiederholung kurz/umfassend.
const K = ['induktiv_offen', 'induktiv_gelenkt', 'induktiv_gestuft', 'induktiv_kompakt', 'deduktiv_darbietend', 'deduktiv_loesungsbeispiel', 'deduktiv_material', 'deduktiv_kompakt', 'vertieft_problemloesend', 'vertieft_gestaltend', 'vertieft_erkundend', 'vertieft_perspektivisch', 'wiederholung_kurz', 'wiederholung_umfassend'];
const v = (...werte) => Object.fromEntries(K.map((k, i) => [k, werte[i]]));

export const VARIANTEN_PASSUNG_5 = {
  'Strukturiertes Textmapping': v(
    [2, 'Text selbst erkunden, Kategorien gemeinsam finden.'], [1, 'Vorgegebene Kategorien lenken das Lesen.'], [2, 'Kategorie für Kategorie erarbeiten.'], [3, 'Kurzform mit wenigen Kategorien.'],
    [3, 'Eingeführte Kategorien anwenden.'], [2, 'Am Mustertext vormachen, dann selbst mappen.'], [1, 'Material gezielt erschließen.'], [3, 'Nur bei sehr kurzem Text.'],
    [2, 'Fallmaterial ordnen.'], [3, 'Map als Teilprodukt.'], [1, 'Quellen kriteriengeleitet auswerten.'], [2, 'Positionen im Text kartieren.'],
    [3, 'Für kurze Wiederholung meist zu lang.'], [2, 'Analysekategorien der Einheit an neuem Text sichern.']),
  'Modellbau und Modellkritik': v(
    [2, 'Eigenes Modell als Erklärungsversuch.'], [2, 'Modell gelenkt prüfen.'], [3, 'Bauschritte als Stufen.'], [4, 'Braucht Zeit.'],
    [3, 'Eingeführtes Modell nachbauen.'], [3, 'Mustermodell als Beispiel.'], [3, 'Modell aus Material entwickeln.'], [5, 'Zu aufwendig.'],
    [2, 'Modell als Lösungsansatz.'], [1, 'Modell als Teamprodukt.'], [1, 'Modell testen und kritisieren.'], [4, 'Kaum Bezug.'],
    [5, 'Zu aufwendig.'], [3, 'Modell der Einheit überprüfen.']),
  'Argumentationsmap': v(
    [4, 'Kaum Entdeckung.'], [3, 'Argumente gelenkt ordnen.'], [2, 'Schrittweise ergänzen.'], [4, 'Braucht Zeit.'],
    [3, 'Argumentationsstruktur anwenden.'], [2, 'Muster-Map als Beispiel.'], [2, 'Argumente aus Material ordnen.'], [4, 'Zu aufwendig.'],
    [2, 'Entscheidung begründen.'], [2, 'Map als Produkt.'], [4, 'Kaum Bezug.'], [1, 'Pro und Contra strukturiert abwägen.'],
    [3, 'Argumente erneut ordnen.'], [2, 'Streitfragen der Einheit ordnen.']),
  'Denkhüte (Sechs Hüte)': v(
    [3, 'Fragen aus mehreren Blickwinkeln.'], [3, 'Hüte lenken das Denken.'], [3, 'Hüte nacheinander.'], [4, 'Braucht Zeit.'],
    [5, 'Kein Bezug.'], [5, 'Kein Bezug.'], [3, 'Material aus verschiedenen Blickwinkeln.'], [5, 'Kein Bezug.'],
    [2, 'Problem allseitig betrachten.'], [3, 'Ideen prüfen.'], [4, 'Kaum Bezug.'], [1, 'Perspektiven gezielt einnehmen.'],
    [5, 'Kein Bezug.'], [3, 'Thema rückblickend bewerten.']),
  'Walt-Disney-Methode': v(
    [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [5, 'Kein Bezug.'],
    [5, 'Kein Bezug.'], [5, 'Kein Bezug.'], [4, 'Kaum Bezug.'], [5, 'Kein Bezug.'],
    [2, 'Lösungsideen entwickeln und prüfen.'], [1, 'Träumen, planen, kritisieren für ein Produkt.'], [4, 'Kaum Bezug.'], [2, 'Drei Rollen als Perspektiven.'],
    [5, 'Kein Bezug.'], [4, 'Kaum Bezug.']),
  'Zukunftswerkstatt': v(
    [3, 'Problem selbst erschließen.'], [4, 'Zu offen.'], [4, 'Kaum Stufung.'], [5, 'Zu aufwendig.'],
    [5, 'Kein Bezug.'], [5, 'Kein Bezug.'], [4, 'Kaum Bezug.'], [5, 'Kein Bezug.'],
    [1, 'Kritik, Utopie, Umsetzung für ein reales Problem.'], [2, 'Zukunftsentwurf als Produkt.'], [3, 'Ist-Zustand untersuchen.'], [2, 'Wünsche und Interessen abwägen.'],
    [5, 'Kein Bezug.'], [4, 'Kaum Bezug.']),
  'Perspektivwechsel': v(
    [3, 'Neue Sicht öffnet Fragen.'], [2, 'Gelenkte Rollenwahl.'], [3, 'Rollenkarten als Stütze.'], [3, 'Kurz möglich.'],
    [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [2, 'Material aus einer Rolle lesen.'], [4, 'Kaum Bezug.'],
    [2, 'Fall aus mehreren Sichten.'], [3, 'Text aus anderer Sicht.'], [4, 'Kaum Bezug.'], [1, 'Kern der perspektivischen Variante.'],
    [3, 'Thema aus anderer Sicht wiederholen.'], [3, 'Als Transfer.']),
  'Planspiel': v(
    [3, 'Zusammenhänge im Spiel erleben.'], [4, 'Zu offen.'], [4, 'Kaum Stufung.'], [5, 'Zu aufwendig.'],
    [5, 'Kein Bezug.'], [5, 'Kein Bezug.'], [3, 'Rollenmaterial als Grundlage.'], [5, 'Kein Bezug.'],
    [1, 'Komplexe Entscheidungslage lösen.'], [3, 'Kaum Produkt.'], [3, 'Wirkungen erproben.'], [1, 'Interessen vertreten und aushandeln.'],
    [5, 'Kein Bezug.'], [3, 'Als Anwendung der Einheit.']),
  'Storyline': v(
    [2, 'Die Geschichte wirft Fragen auf, die selbst geklärt werden.'], [2, 'Schlüsselfragen lenken die Episoden.'], [3, 'Episoden als Stufen.'], [5, 'Über mehrere Stunden angelegt.'],
    [5, 'Widerspricht der Darbietung.'], [4, 'Kaum Bezug.'], [3, 'Material in die Geschichte eingebettet.'], [5, 'Zu aufwendig.'],
    [1, 'Probleme der Geschichte im Team lösen.'], [1, 'Figuren, Orte und Produkte gestalten.'], [2, 'Fragen der Geschichte untersuchen.'], [2, 'Sichtweisen der Figuren.'],
    [5, 'Zu aufwendig.'], [4, 'Höchstens als Abschlussepisode.']),
  'Projektarbeit': v(
    [3, 'Offene Fragen, aber wenig gemeinsame Regelbildung.'], [4, 'Zu wenig Lenkung.'], [3, 'Meilensteine als Stufen.'], [5, 'Über mehrere Stunden angelegt.'],
    [5, 'Kein Bezug.'], [4, 'Kaum Bezug.'], [3, 'Material als Grundlage.'], [5, 'Kein Bezug.'],
    [1, 'Reales Problem im Team lösen.'], [1, 'Produkt steht im Zentrum.'], [1, 'Eigene Untersuchungen.'], [2, 'Perspektiven im Projekt.'],
    [5, 'Kein Bezug.'], [4, 'Nur als Anwendung der Einheit.']),
  'Polya-Schema': v(
    [3, 'Strukturiert eigenes Problemlösen.'], [2, 'Vier Schritte lenken den Weg.'], [1, 'Die Schritte sind die Stufen.'], [3, 'Mit einer Aufgabe möglich.'],
    [3, 'Vorgehen nach Einführung anwenden.'], [1, 'Lösungsbeispiel entlang der Schritte.'], [3, 'Material mit Strategiehilfe.'], [3, 'Kurze Anwendung.'],
    [1, 'Kernwerkzeug für Problemaufgaben.'], [4, 'Wenig Bezug.'], [2, 'Untersuchung planen.'], [5, 'Kein Bezug.'],
    [3, 'Strategie erneut anwenden.'], [2, 'Problemlösestrategie festigen.']),
  'Impuls-Lesen': v(
    [3, 'Impulse öffnen eigene Deutungen.'], [2, 'Gelenkte Impulse zum Text.'], [2, 'Impulse als Stufen.'], [3, 'Mit wenigen Impulsen.'],
    [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [1, 'Material gezielt erschließen.'], [3, 'Kurzer Text.'],
    [3, 'Fallmaterial erschließen.'], [4, 'Wenig Bezug.'], [3, 'Quellen auswerten.'], [3, 'Positionen im Text finden.'],
    [3, 'Bekannten Text neu lesen.'], [3, 'Kerntext erneut erschließen.']),
  'Lotus-Diagramm': v(
    [3, 'Ideen um eine Kernfrage entfalten.'], [3, 'Vorgegebene Unterthemen lenken.'], [2, 'Felder nacheinander füllen.'], [4, 'Braucht Zeit.'],
    [3, 'Neues Thema gliedern.'], [5, 'Kein Bezug.'], [2, 'Material strukturieren.'], [4, 'Zu aufwendig.'],
    [2, 'Lösungsideen systematisch entfalten.'], [2, 'Ideen für das Produkt.'], [3, 'Untersuchungsfragen gliedern.'], [3, 'Aspekte sammeln.'],
    [3, 'Zu aufwendig für kurz.'], [1, 'Gliedert die Einheit in Teilthemen.']),
  'Cornell-Methode': v(
    [5, 'Kein Entdeckungsformat.'], [4, 'Kaum Bezug.'], [3, 'Stichwortspalte als Lernhilfe.'], [4, 'Kaum Bezug.'],
    [1, 'Strukturierte Mitschrift zum Vortrag.'], [3, 'Beispiel mitschreiben.'], [2, 'Material strukturiert festhalten.'], [3, 'Kurze Mitschrift.'],
    [4, 'Kaum Bezug.'], [5, 'Kein Bezug.'], [3, 'Beobachtungen notieren.'], [4, 'Kaum Bezug.'],
    [2, 'Mit Stichwortspalte abfragen.'], [1, 'Notizen als Lernmaterial nutzen.']),
  'PQ4R / SQ3R': v(
    [5, 'Kein Entdeckungsformat.'], [4, 'Kaum Bezug.'], [2, 'Feste Leseschritte als Stütze.'], [4, 'Zu aufwendig.'],
    [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [1, 'Sachtexte selbstständig erschließen.'], [5, 'Zu aufwendig.'],
    [3, 'Fallmaterial erschließen.'], [4, 'Kaum Bezug.'], [3, 'Quellen gründlich lesen.'], [4, 'Kaum Bezug.'],
    [4, 'Zu aufwendig.'], [2, 'Lerntexte gezielt wiederholen.']),
  'Bestimmungsarbeit': v(
    [3, 'Merkmale selbst erkunden.'], [1, 'Mit Schlüssel gelenkt zur Ordnung.'], [2, 'Schrittweise bestimmen.'], [3, 'Mit wenigen Objekten.'],
    [3, 'Eingeführte Merkmale anwenden.'], [2, 'Musterbestimmung als Beispiel.'], [2, 'Bestimmungsschlüssel als Material.'], [3, 'Kurz möglich.'],
    [3, 'Unbekanntes bestimmen.'], [3, 'Eigenen Schlüssel erstellen.'], [1, 'Untersuchen und ordnen.'], [5, 'Kein Bezug.'],
    [2, 'Merkmale erneut anwenden.'], [2, 'Ordnungssystem festigen.']),
  'Black-Box-Experiment': v(
    [1, 'Unbekanntes Innenleben erschließen.'], [2, 'Gelenkte Tests.'], [3, 'Hinweise als Stufen.'], [3, 'Mit einfacher Box.'],
    [5, 'Widerspricht der Methode.'], [5, 'Kein Bezug.'], [4, 'Kaum Bezug.'], [5, 'Kein Bezug.'],
    [2, 'Rätsel im Team lösen.'], [3, 'Modell als Produkt.'], [1, 'Hypothesen experimentell prüfen.'], [5, 'Kein Bezug.'],
    [5, 'Kein Bezug.'], [4, 'Höchstens als Transfer.']),
  'Karikatur- / Quellenanalyse': v(
    [3, 'Eigene Deutung der Quelle.'], [2, 'Analyseschritte lenken.'], [2, 'Schritte als Stufen.'], [3, 'Mit kurzer Quelle.'],
    [3, 'Methode nach Einführung anwenden.'], [2, 'Musteranalyse als Beispiel.'], [1, 'Quelle als Material erschließen.'], [3, 'Kurze Analyse.'],
    [3, 'Quelle als Fall.'], [3, 'Eigene Karikatur gestalten.'], [2, 'Quellen untersuchen.'], [1, 'Absicht und Standpunkt erkennen.'],
    [3, 'Bekannte Quelle erneut deuten.'], [2, 'Transfer an neuer Quelle.']),
  'Reziprokes Lesen': v(
    [4, 'Erschließung statt Entdeckung.'], [3, 'Die Rollen lenken das Lesen.'], [2, 'Rollenkarten als Stütze.'], [4, 'Braucht mehr Zeit.'],
    [4, 'Kaum Bezug zur Darbietung.'], [4, 'Kaum Bezug.'], [1, 'Material gemeinsam und gründlich erschließen.'], [5, 'Zu aufwendig.'],
    [3, 'Fallmaterial im Team erschließen.'], [4, 'Wenig Bezug zum Produkt.'], [2, 'Quellen gemeinsam auswerten.'], [3, 'Positionen im Text klären.'],
    [4, 'Zu aufwendig.'], [3, 'Kerntext erneut erschließen.']),
  'Gruppenpuzzle (Jigsaw)': v(
    [4, 'Arbeitsteilung erschwert gemeinsames Entdecken.'], [3, 'Expertengruppen prüfen Teilaspekte.'], [3, 'Experten helfen einander.'], [5, 'Zu aufwendig.'],
    [4, 'Ersetzt die Darbietung durch Schüler.'], [3, 'Jede Gruppe erklärt ein Beispiel.'], [1, 'Material arbeitsteilig erschließen und vermitteln.'], [5, 'Zu aufwendig.'],
    [2, 'Teilwissen für den Fall zusammenführen.'], [3, 'Produkt aus Teilbeiträgen.'], [2, 'Teilfragen untersuchen.'], [1, 'Jede Gruppe vertritt eine Position.'],
    [5, 'Zu aufwendig.'], [2, 'Teilthemen der Einheit wiederholen.']),
  'Arbeitsteilige Gruppenarbeit': v(
    [3, 'Gruppen erkunden verschiedene Beispiele.'], [2, 'Vergleich der Gruppenergebnisse führt zur Regel.'], [3, 'Material je Gruppe gestuft.'], [4, 'Zu aufwendig.'],
    [4, 'Kaum Bezug.'], [3, 'Verschiedene Beispiele je Gruppe.'], [1, 'Material arbeitsteilig auswerten.'], [5, 'Zu aufwendig.'],
    [2, 'Teilprobleme lösen.'], [2, 'Teilprodukte zusammenführen.'], [1, 'Verschiedene Untersuchungen parallel.'], [2, 'Gruppen bearbeiten je eine Perspektive.'],
    [4, 'Zu aufwendig.'], [2, 'Themen der Einheit aufteilen.']),
  'Stationenlernen / Lernzirkel': v(
    [3, 'Stationen bieten verschiedene Phänomene.'], [3, 'Aufträge lenken die Erkundung.'], [2, 'Hilfen an jeder Station.'], [5, 'Zu aufwendig.'],
    [4, 'Kaum Bezug.'], [3, 'Lösungsbeispiele an den Stationen.'], [2, 'Material in Stationen erschließen.'], [5, 'Zu aufwendig.'],
    [3, 'Teilprobleme an Stationen.'], [3, 'Station als Produktwerkstatt.'], [2, 'Versuchsstationen.'], [3, 'Je Station eine Perspektive.'],
    [4, 'Zu aufwendig.'], [1, 'Ideal für umfassende Wiederholung mit Wahl.']),
  'WebQuest': v(
    [3, 'Recherche kann Entdeckung tragen.'], [3, 'Gelenkte Quellen und Fragen.'], [2, 'Aufgaben in Stufen.'], [5, 'Zu aufwendig.'],
    [4, 'Kaum Bezug.'], [4, 'Kaum Bezug.'], [1, 'Quellen gezielt erschließen.'], [5, 'Zu aufwendig.'],
    [2, 'Recherche zur Lösung eines Problems.'], [2, 'Rechercheergebnis als Produkt.'], [1, 'Gelenkte Untersuchung im Netz.'], [2, 'Positionen recherchieren.'],
    [5, 'Zu aufwendig.'], [3, 'Als Vertiefungsrecherche.']),
  'Zeitstrahl erstellen': v(
    [3, 'Zusammenhänge in der Abfolge entdecken.'], [2, 'Gelenktes Ordnen zeigt Entwicklung.'], [2, 'Ereignisse nacheinander ergänzen.'], [2, 'Schnell umsetzbar.'],
    [3, 'Sichert eingeführte Abfolgen.'], [4, 'Kaum Bezug.'], [2, 'Daten aus Material ordnen.'], [3, 'Mit wenigen Daten möglich.'],
    [3, 'Ordnet den Fall zeitlich.'], [2, 'Zeitleiste als Teamprodukt.'], [3, 'Entwicklungen untersuchen.'], [3, 'Sichtweisen im Zeitverlauf.'],
    [2, 'Abfolge schnell wiederholen.'], [1, 'Ordnet die ganze Einheit.']),
  'Think-Pair-Share': v(
    [2, 'Eigene Vermutungen, dann Austausch.'], [1, 'Vermuten, prüfen, teilen in klaren Schritten.'], [2, 'Partner als Hilfe.'], [1, 'Schnell und strukturiert.'],
    [2, 'Verarbeitung nach dem Input.'], [2, 'Lösungsbeispiel erst allein, dann zu zweit erklären.'], [2, 'Material erst allein, dann im Austausch.'], [1, 'Kurze Verarbeitung.'],
    [3, 'Ideen vor der Teamarbeit sammeln.'], [3, 'Ideen sammeln.'], [3, 'Vorgehen planen.'], [2, 'Eigene Position bilden, dann abgleichen.'],
    [1, 'Schnelles Reaktivieren mit Austausch.'], [2, 'Lücken im Austausch erkennen.']),
  'Placemat': v(
    [2, 'Eigene Ideen, dann gemeinsamer Kern.'], [2, 'Zu einer Leitfrage zusammenführen.'], [3, 'Wenig Stufung.'], [3, 'Kostet etwas Zeit.'],
    [3, 'Verarbeitung nach Input.'], [4, 'Kaum Bezug.'], [2, 'Materialergebnisse bündeln.'], [4, 'Zu aufwendig.'],
    [2, 'Lösungsideen sammeln und einigen.'], [2, 'Konzept für das Produkt.'], [3, 'Vorgehen abstimmen.'], [2, 'Positionen sammeln und abgleichen.'],
    [2, 'Vorwissen in der Gruppe bündeln.'], [2, 'Zentrale Inhalte gemeinsam sammeln.']),
  'Expertenrunde': v(
    [4, 'Kein Entdeckungsformat.'], [3, 'Experten erklären Teilergebnisse.'], [3, 'Experten als Hilfe.'], [5, 'Zu aufwendig.'],
    [3, 'Schüler statt Lehrkraft erklären.'], [3, 'Experten erklären Beispiele.'], [1, 'Material erschließen und weitergeben.'], [5, 'Zu aufwendig.'],
    [2, 'Fachwissen für den Fall bündeln.'], [3, 'Beiträge zum Produkt.'], [2, 'Ergebnisse vermitteln.'], [2, 'Positionen vertreten.'],
    [4, 'Zu aufwendig.'], [2, 'Experten wiederholen Teilthemen.']),
  'Freiarbeit': v(
    [3, 'Eigene Wege, aber wenig gemeinsame Regelbildung.'], [4, 'Zu wenig Lenkung.'], [3, 'Selbstgewählte Hilfen.'], [5, 'Braucht viel Zeit.'],
    [5, 'Widerspricht der Darbietung.'], [3, 'Lösungsbeispiele als Selbstlernmaterial.'], [2, 'Material frei wählen und bearbeiten.'], [5, 'Zu aufwendig.'],
    [3, 'Selbstgewählte Probleme.'], [2, 'Eigene Produkte.'], [2, 'Eigene Untersuchungen.'], [3, 'Eigene Themenwahl.'],
    [4, 'Zu offen.'], [1, 'Individuelle Wiederholung nach Bedarf.']),
  'Fragend-entwickelndes Unterrichtsgespräch': v(
    [4, 'Lenkt zu stark für offenes Entdecken.'], [1, 'Leitfragen führen Schritt für Schritt zur Regel.'], [2, 'Fragen als gestufte Impulse.'], [1, 'Schnellster Weg zur gemeinsamen Erkenntnis.'],
    [2, 'Klärt die eingeführte Regel im Gespräch.'], [2, 'Das Lösungsbeispiel wird gemeinsam besprochen.'], [2, 'Sicherung nach der Materialarbeit.'], [1, 'Kurz und gut steuerbar.'],
    [3, 'Höchstens zum Klären des Auftrags.'], [4, 'Kaum Bezug zum Produkt.'], [3, 'Zum Planen der Untersuchung.'], [4, 'Lenkt Positionen zu stark.'],
    [1, 'Schnelles Reaktivieren mit gezielten Fragen.'], [2, 'Strukturiert die Wiederholung im Plenum.']),
  'Merksatz formulieren': v(
    [2, 'Abschluss der Entdeckung: die Regel in eigenen Worten.'], [1, 'Der Merksatz ist das Ziel der gelenkten Erarbeitung.'], [1, 'Schrittweise zum eigenen Merksatz.'], [1, 'Knappes Sichern der Regel.'],
    [2, 'Regel in eigenen Worten wiedergeben.'], [2, 'Aus dem Beispiel die Regel ableiten.'], [1, 'Ergebnis der Materialarbeit festhalten.'], [2, 'Kurzes Sichern.'],
    [4, 'Wenig Bezug zum Fall.'], [4, 'Trägt kein Produkt.'], [3, 'Ergebnis der Untersuchung formulieren.'], [5, 'Kein Bezug.'],
    [2, 'Merksätze aus dem Gedächtnis aufschreiben.'], [1, 'Merksätze der Einheit sammeln und prüfen.']),
  'Concept Mapping': v(
    [3, 'Ordnet Beobachtungen, ersetzt aber nicht das Entdecken.'], [3, 'Zum Sichern der Zusammenhänge.'], [2, 'Begriffe nach und nach ergänzen.'], [4, 'Braucht zu viel Zeit.'],
    [3, 'Ordnet das Neue in Bekanntes ein.'], [4, 'Wenig Bezug zum Lösungsbeispiel.'], [2, 'Material in eine Struktur bringen.'], [5, 'Zu aufwendig.'],
    [3, 'Zusammenhänge des Falls ordnen.'], [2, 'Die Map als Teamprodukt.'], [3, 'Ergebnisse strukturieren.'], [3, 'Positionen und Argumente verknüpfen.'],
    [3, 'Für kurze Wiederholung zu aufwendig.'], [1, 'Zeigt Zusammenhänge und Lücken der ganzen Einheit.']),
  'Strukturlegetechnik': v(
    [3, 'Begriffe ordnen kann Zusammenhänge entdecken lassen.'], [2, 'Gelenkt mit vorgegebenen Karten.'], [2, 'Karten nacheinander legen.'], [3, 'Mit wenigen Karten möglich.'],
    [3, 'Sichert die eingeführte Struktur.'], [4, 'Kaum Bezug.'], [2, 'Material in eine Struktur legen.'], [4, 'Kostet zu viel Zeit.'],
    [3, 'Ordnet die Elemente des Falls.'], [3, 'Legebild als Produkt.'], [3, 'Ergebnisse ordnen.'], [3, 'Argumente gegenüberstellen.'],
    [2, 'Begriffe schnell wieder ordnen.'], [1, 'Ordnet die zentralen Begriffe der Einheit.']),
  'Objekt-Analyse': v(
    [1, 'Ein Gegenstand als Phänomen, das selbst erkundet wird.'], [2, 'Mit Beobachtungsfragen gut lenkbar.'], [2, 'Beobachtungsaufträge als Stufen.'], [3, 'Möglich mit einem klaren Auftrag.'],
    [3, 'Als Anschauung zur Regel.'], [4, 'Kaum Bezug.'], [2, 'Das Objekt ist das Material.'], [4, 'Zu aufwendig.'],
    [2, 'Das Objekt stellt den Fall.'], [3, 'Kann zu einem Produkt anregen.'], [1, 'Untersuchen ist der Kern.'], [3, 'Objekt aus verschiedenen Blickwinkeln.'],
    [4, 'Kaum Wiederholungscharakter.'], [3, 'Als Transfer an einem neuen Objekt.']),
  'Mystery / Rätsel': v(
    [1, 'Rätselhafte Frage, die eigene Lösungswege verlangt.'], [2, 'Mit Hinweisen gut lenkbar.'], [2, 'Infokarten in Stufen ausgeben.'], [4, 'Braucht deutlich mehr Zeit.'],
    [4, 'Gibt die Lösung zu früh vor.'], [4, 'Kaum Bezug.'], [2, 'Die Infokarten sind das Material.'], [5, 'Zu aufwendig.'],
    [1, 'Ideal: Teams lösen ein komplexes Rätsel.'], [3, 'Lösung als Schaubild darstellen.'], [2, 'Zusammenhänge untersuchen.'], [3, 'Verschiedene Erklärungen abwägen.'],
    [4, 'Zu aufwendig.'], [2, 'Wissen der Einheit verknüpfen.']),
  'Fallstudie': v(
    [2, 'Ein realer Fall als Phänomen.'], [3, 'Mit Leitfragen lenkbar.'], [3, 'Fallmaterial in Stufen.'], [5, 'Zu aufwendig.'],
    [3, 'Anwendung der Regel am Fall.'], [3, 'Ein gelöster Fall als Beispiel.'], [2, 'Fallmaterial erschließen.'], [5, 'Zu aufwendig.'],
    [1, 'Teams analysieren und lösen den Fall.'], [3, 'Lösungsvorschlag als Produkt.'], [2, 'Den Fall untersuchen.'], [2, 'Beteiligte Perspektiven abwägen.'],
    [4, 'Zu aufwendig.'], [2, 'Transfer am neuen Fall.']),
  'Schülerexperiment': v(
    [1, 'Eigenes Experimentieren führt zur Entdeckung.'], [1, 'Vermutung prüfen mit angeleitetem Versuch.'], [2, 'Versuchsanleitung in Stufen.'], [3, 'Nur mit einfachem Versuch.'],
    [3, 'Bestätigt die eingeführte Regel.'], [3, 'Versuch nach Musterprotokoll.'], [3, 'Versuch als Material.'], [4, 'Zu aufwendig.'],
    [2, 'Experiment zur Lösung eines Problems.'], [3, 'Versuchsaufbau als Produkt.'], [1, 'Untersuchung selbst planen und durchführen.'], [4, 'Kaum Bezug.'],
    [4, 'Zu aufwendig.'], [3, 'Als Transferversuch.']),
  'Textknacken / Markieren': v(
    [4, 'Wenig Entdeckung, eher Erschließung.'], [3, 'Markierauftrag lenkt auf das Wesentliche.'], [2, 'Text abschnittsweise erschließen.'], [3, 'Mit kurzem Text möglich.'],
    [3, 'Regel im Text wiederfinden.'], [3, 'Lösungsbeispiel genau lesen.'], [1, 'Kernmethode zum Erschließen von Material.'], [3, 'Kurzer Text, schneller Auftrag.'],
    [3, 'Fallmaterial erschließen.'], [3, 'Inhalte für das Produkt sammeln.'], [3, 'Quellen auswerten.'], [3, 'Positionen im Text finden.'],
    [3, 'Bekannten Text erneut markieren.'], [2, 'Kerntexte der Einheit erneut erschließen.']),
  'Insert-Methode': v(
    [4, 'Erschließung statt Entdeckung.'], [3, 'Symbole lenken das Lesen.'], [2, 'Symbole zeigen, wo Hilfe nötig ist.'], [3, 'Mit kurzem Text möglich.'],
    [3, 'Neue Informationen mit Vorwissen abgleichen.'], [4, 'Kaum Bezug.'], [1, 'Material aktiv mit Vorwissen abgleichen.'], [3, 'Nur bei kurzem Text.'],
    [3, 'Fallmaterial erschließen.'], [4, 'Wenig Bezug zum Produkt.'], [3, 'Quellen auswerten.'], [3, 'Zustimmung und Widerspruch markieren.'],
    [3, 'Zeigt schnell, was bekannt ist.'], [2, 'Bekanntes und Neues in der Einheit trennen.']),
};