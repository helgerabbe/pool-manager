# Bisherige Übungen in Aufgaben umwandeln

Stand: 2026-11-11. Mit der Lehrkraft vereinbart, gilt für alle Einheiten.

## Regeln

1. **Grundsatz:** Jede bisherige Übung eines Lernpakets wird eine eigene Aufgabe im selben Lernpaket, mit der Übung als einzigem Element.
2. **Einstellungen:** Neue Aufgaben starten mit Niveau „GE" und „Pflicht". Sie behalten ihre bisherige Reihenfolge und stehen hinter den schon vorhandenen Aufgaben.
3. **Titel:** Steht im Aufgabentext eine Überschrift, wird sie der Titel. Sonst ein kurzer Titel, der sagt, was die Schüler tun. Die Lehrkraft bekommt die Titelliste vor der Umwandlung zur Durchsicht.
4. **Offene Aufgaben:** Übernommen wird die freigegebene fertige Fassung. Der ursprüngliche Auftrag an die KI („Prompt für die KI …") bleibt nur als Hintergrund erhalten.
5. **Varianten:** Eine Übung mit mehreren Varianten wird eine Aufgabe mit einem Element je Variante und der Auswahl „1 von N".
6. **Alte Übung:** Sie wird ausgeblendet, nicht gelöscht, bis die Lehrkraft die Umwandlung geprüft hat. Schüler und Export dürfen sie nicht doppelt bekommen.

## Zusammenfassen zu einer Aufgabe mit mehreren Elementen

Zusammengefasst wird nur innerhalb eines Lernpakets und nur in zwei Fällen:

- **Deutlich:** Die Übungen arbeiten mit denselben Inhalten oder demselben Material.
- **Naheliegend:** Die Übungen bauen unmittelbar aufeinander auf (erst der Einstieg, dann die Anwendung zum selben Gegenstand).

Nicht zusammengefasst wird:

- **KI-Tutor-Aufgaben:** Jedes Gespräch bleibt eine eigene Aufgabe.
- **Übungen mit eigenem Material:** Auch wenn sie didaktisch aufeinander aufbauen.
- **Ähnlich klingende Übungen ohne gemeinsame Inhalte:** Das können Alternativen sein, keine Schritte.
- **Gleiches Format allein:** Reicht nicht als Grund.

Folgen beim Zusammenfassen:

- Niveau und Pflicht oder freiwillig gelten für alle Elemente gemeinsam.
- Die Zufallsauswahl gilt für die ganze Aufgabe. Hat eine zusammengefasste Übung Varianten, wird nur eine Variante übernommen.

Der Lehrkraft gemeldet, nicht selbst entschieden, werden:

- Texte, die auf eine frühere Übung verweisen („vorhin hast du …"), wenn diese im Lernpaket fehlt.
- Übungen, die eher Material zu einer anderen Übung sind als eine eigene Aufgabe.

## Technische Zuordnung (so umgesetzt bei Kurzgeschichten)

- Offene Aufgabe → Element „offen" mit dem freigegebenen Fragment. Der Auftragstext (description) bleibt nur an der ausgeblendeten Übung.
- KI-Tutor → Element „brian": instruction → Anweisung für Lernende, system_prompt → interne Anweisung. Fehlt der Dialogname, wird der Aufgabentitel eingesetzt.
- Alle anderen Formate → Element „katalog" mit derselben Aktivität. Der Inhalt liegt oft nicht an der Übung, sondern an ihren Varianten (MasterAufgabe).
- Ausblenden = sync_status 'to_delete' an der Übung. Die Varianten bleiben unverändert. Rückgängig: sync_status wieder auf den alten Wert setzen und die neue Aufgabe löschen.
- Zusatzfelder an Elementen (z. B. ein Verweis auf die alte Übung) werden beim Speichern verworfen. Die Zuordnung alt → neu steht deshalb nur in diesem Dokument.

## Einheit Kurzgeschichten (umgewandelt am 2026-11-11)

Die 40 Übungen (Kennungen unten) sind ausgeblendet, vorher sync_status 'new'. Die 36 neuen Aufgaben sind Entwürfe. Bei 10 KI-Tutor-Elementen fehlte schon vorher die Abschlussregel: 2f486, 928a1, 8de87, 0fce0, f1d71, 1bcd9, d112c, 61726, 2552f, cc78b. Sie wurde am 2026-11-11 in den neuen Aufgaben ergänzt, abgeleitet aus dem Abschluss, den die interne Anweisung des jeweiligen Gesprächs schon beschreibt.

Aus 40 Übungen werden 36 Aufgaben. Kennungen = letzte fünf Zeichen der Übung. „(?)" = Titel nur aus dem Textanfang abgeleitet, unsicher.

### Zusammengefasst

| Lernpaket | Übungen | Titel |
|---|---|---|
| Thema und Aussageabsicht | ee4a4 + 542d0 (nur eine Variante) + 1e88d | Die großen Lebensthemen kennenlernen |
| Handlung und Konflikt | acf04 + fd6fd | Erzählbausteine zuordnen und den zentralen bestimmen |
| Analyseteil | 55b5d + 1e943 | Den Hauptteil Schritt für Schritt aufbauen |

### Einzeln

| Übung | Lernpaket | Titel |
|---|---|---|
| 8cbcd | Merkmale benennen | Wahr oder falsch? Fehlersuche zu den Merkmalen |
| ff720 | Merkmale benennen | Beschreibungen den Merkmalen zuordnen |
| 274b5 | Merkmale benennen | Strukturmerkmale treffend beschreiben (1 von 3) |
| f856a | Merkmale benennen | Lernzettel: Merkmale einer Kurzgeschichte |
| 4195f | Merkmale nachweisen | Prüffragen den Merkmalen zuordnen |
| d6af9 | Merkmale nachweisen | Merkmale in Textpassagen erkennen (1 von 3) |
| 3ab6a | Merkmale nachweisen | Das dominierende Merkmal bestimmen (1 von 3) |
| 5fd91 | Merkmale nachweisen | Textbelege markieren: Wo steckt das Merkmal? |
| 048c3 | Erzählperspektive | Erzählperspektive im Lückentext ergänzen (1 von 3) |
| 048c4 | Erzählperspektive | Textproben-Detektiv: Welcher Erzähler spricht? |
| cc78b | Erzählperspektive | Die Sprungbrett-Szene aus anderer Perspektive erzählen |
| d8551 | Sprachliche Mittel | Stilmittel und Beispiele zuordnen |
| a7498 | Sprachliche Mittel | Der Stiftkasten: Textstellen markieren und einordnen |
| 2552f | Sprachliche Mittel | Flachbügeln: Wirkung durch Zerstören sichtbar machen |
| 42153 | Offener Schluss | Die interaktive Abzweigung: Wie geht es weiter? |
| 33141 | Offener Schluss | Ein offenes Ende deuten und begründen (?) |
| 61726 | Offener Schluss | „Das Fenster-Theater": Warum bleibt der Schluss offen? |
| d112c | Thema und Aussageabsicht | Perspektivwechsel: Werde selbst zum Autor |
| 6e15a | Thema und Aussageabsicht | „Das Brot": Vom Geschehen zum Thema |
| f1d71 | Symbolik | Der Symbol-Vergleichstest |
| fe0ab | Symbolik | Einen Gegenstand als Symbol deuten (?) |
| 64f00 | Symbolik | Literarische Symbole erkennen und deuten (?) |
| 1bcd9 | Symbolik | Erschaffe ein Symbol: Die Lücke im Text füllen |
| 76242 | Historischer Kontext | Handlung und Rahmenbedingungen zuordnen |
| 8de87 | Historischer Kontext | Gedankenexperiment: Zeitreise einer Alltagshandlung |
| 0fce0 | Historischer Kontext | „Das Brot": Das stumme Spiel um eine Scheibe Brot |
| 59b01 | Aufbau und Struktur | Den Aufbau einer Analyse üben |
| f072e | Aufbau und Struktur | Eine Beispielanalyse untersuchen: „Die Nachricht" (?) |
| 928a1 | Aufbau und Struktur | Den Aufbau einer Analyse erklären |
| 9398a | Einleitung und Inhaltsangabe | Eine Einleitung schreiben |
| 2f486 | Analyseteil | Behauptung, Beleg, Erklärung: Den Hauptteil üben |
| c50dd | Schlussteil | Den Schlussteil verfassen |
| 5e047 | Idee finden und planen | Die Schreibideen-Maschine |

### Offen

- **cc78b:** verweist auf einen „inneren Monolog" von vorhin, der unter den Übungen des Lernpakets nicht vorkommt.
- **f072e:** könnte Material zu 59b01 sein statt einer eigenen Aufgabe.

## Einheit Kreis und Körper (umgewandelt am 2026-11-11)

Die 64 Übungen (Kennungen unten) sind ausgeblendet, vorher sync_status 'new'. Aus 64 Übungen wurden 64 Aufgaben, alle Entwürfe mit „GE" und „Pflicht". Zusammengefasst wurde nichts, weil keine zwei Übungen dasselbe Material nutzen.

- **Offen, leer (10):** Zu diesen offenen Aufgaben gab es keine fertige Fassung. Angelegt als geplantes Element ohne Fragment; der Auftragstext steht als Aufgabenstellung an der Aufgabe und als Kurzbeschreibung am Element. Sie müssen in der Werkstatt gebaut werden.
- **KI-Tutor (15):** Allen fehlte die Abschlussregel. Sie wurde am 2026-11-11 in den neuen Aufgaben ergänzt, abgeleitet aus der Lösung in der internen Anweisung des jeweiligen Gesprächs. Fehlte der Dialogname, wurde der Titel eingesetzt.
- **261ce, Teil c):** Die hinterlegte Lösung (6 763,72 cm²) passt nicht zu d = 0,5 m (rechnerisch 7 853,98 cm²). Auf Wunsch der Lehrkraft am 2026-11-11 in der neuen Aufgabe auf 7 853,98 cm² korrigiert; die ausgeblendete Übung hat noch den alten Wert.
- **91e4a:** Der eingebettete Inhalt war schon vorher defekt („???"). Als unvollständig angelegt.
- **6de22 und 495e6:** „Die Suppendose" kommt doppelt vor, als eigenes Gespräch und als erster Schritt von 495e6.
- **Varianten:** d22a0 und abf9a haben je zwei freigegebene Varianten (Variante 2 am Element).

| Übung | Lernpaket | Titel | Element |
|---|---|---|---|
| 23ad6 | Kreisumfang und Kreiszahl Pi | Kreisumfang berechnen (Buch S. 92–93) | katalog |
| fbd00 | Kreisumfang und Kreiszahl Pi | Kreiszahl Pi und Umfangsformel: Wichtiges notieren | brian |
| 8f429 | Kreisfläche berechnen | Herleitung der Flächenformel erklären (Buch S. 94) | offen, leer |
| af994 | Kreisfläche berechnen | Quiz: Flächeninhalt des Kreises | katalog |
| 91e4a | Kreisfläche berechnen | Kreisflächen berechnen (Buch S. 95, Nr. 5–8) | katalog |
| 74965 | Kreisfläche berechnen | Größter Kreis aus der Blechplatte | brian |
| 115ff | Kreisring, Kreisausschnitt und Kreisbogen | Kreisring, Kreisausschnitt und Kreisbogen berechnen | katalog |
| a9989 | Anwendungsaufgaben zu Kreis und Kreisformen | Lückentext: Begriffe und Formeln am Kreis | katalog |
| 737dc | Anwendungsaufgaben zu Kreis und Kreisformen | Kreise im Alltag: Planschbecken, Beet und Sitzplatz | katalog |
| e051f | Anwendungsaufgaben zu Kreis und Kreisformen | Familie Meyer plant ihren Garten | katalog |
| 084dc | Anwendungsaufgaben zu Kreis und Kreisformen | Pizzeria „Bella Torta“: Kreisausschnitte berechnen | offen, leer |
| 9ff11 | Einstieg Prismen | Umbauter Raum: Erster Überblick zu Prismen | katalog |
| 8f3dc | Aufbau und Netz von Prismen | Prismennetze konstruieren | offen, leer |
| 1b634 | Aufbau und Netz von Prismen | Körper benennen | katalog |
| be348 | Aufbau und Netz von Prismen | Körper und Körpernetze zuordnen | katalog |
| 8bac8 | Oberfläche von Prismen berechnen | Oberfläche von Prismen berechnen | offen, leer |
| 4358f | Volumen von Prismen berechnen | Volumen von Prismen berechnen | offen, leer |
| 7bc42 | Anwendungsaufgaben zu Prismen | Oberflächeninhalt eines Prismas am 3D-Modell | offen, leer |
| 4c94c | Anwendungsaufgaben zu Prismen | Volumen eines Bahndamms | offen, leer |
| 51f23 | Aufbau und Netz der quadratischen Pyramide | Netz der Pyramide beschriften | katalog |
| b7226 | Aufbau und Netz der quadratischen Pyramide | Aufbau und Netz der Pyramide begründen | katalog |
| a7829 | Aufbau und Netz der quadratischen Pyramide | Quiz: Aufbau der quadratischen Pyramide | katalog |
| d4696 | Aufbau und Netz der quadratischen Pyramide | Die quadratische Pyramide beschriften | katalog |
| 0e0e0 | Aufbau und Netz der quadratischen Pyramide | Begriffe zur Pyramide zuordnen | katalog |
| 3d132 | Oberfläche der quadratischen Pyramide berechnen | Pavillondach: Mantelfläche berechnen | brian |
| 284e2 | Oberfläche der quadratischen Pyramide berechnen | Aussagen und Rechnungen zur Oberfläche prüfen | katalog |
| 310a5 | Oberfläche der quadratischen Pyramide berechnen | Oberfläche der Pyramide berechnen | katalog |
| 366b1 | Oberfläche der quadratischen Pyramide berechnen | Quiz: Oberfläche der Pyramide | katalog |
| f4992 | Oberfläche der quadratischen Pyramide berechnen | Lückentext: Oberfläche der Pyramide | katalog |
| 1d5e0 | Oberfläche der quadratischen Pyramide berechnen | Fachbegriffe zur Oberfläche zuordnen | katalog |
| a2e50 | Volumen der quadratischen Pyramide berechnen | Fachbegriffe zum Volumen zuordnen | katalog |
| 101e4 | Volumen der quadratischen Pyramide berechnen | Rechenschritte zum Volumen ordnen | katalog |
| 1565e | Volumen der quadratischen Pyramide berechnen | Quiz: Volumen der Pyramide | katalog |
| e81c3 | Volumen der quadratischen Pyramide berechnen | Volumen der Pyramide berechnen | katalog |
| 8c743 | Volumen der quadratischen Pyramide berechnen | Eine eigene Pyramide entwerfen und berechnen | offen, leer |
| 012cc | Anwendungsaufgaben zur quadratischen Pyramide | Arbeitsschritte bei Sachaufgaben ordnen | katalog |
| 20567 | Anwendungsaufgaben zur quadratischen Pyramide | Lösungswege zu Anwendungsaufgaben beurteilen | katalog |
| 414bb | Anwendungsaufgaben zur quadratischen Pyramide | Das Pyramidenzelt | brian |
| ab785 | Aufbau und Netz des Zylinders | Das Netz des Zylinders zeichnen | offen, leer |
| a50e3 | Aufbau und Netz des Zylinders | Lückentext: Aufbau des Zylinders | katalog |
| 6efaf | Aufbau und Netz des Zylinders | Teilflächen des Zylindernetzes beschriften | katalog |
| 127e8 | Oberfläche des Zylinders berechnen | Quiz: Oberfläche des Zylinders | katalog |
| e893d | Oberfläche des Zylinders berechnen | Oberfläche berechnen (r = 3,5 cm, h = 8 cm) | brian |
| 5eeca | Oberfläche des Zylinders berechnen | Oberfläche berechnen (r = 2 cm, h = 5 cm) | brian |
| d5046 | Oberfläche des Zylinders berechnen | Rechenschritte zur Oberfläche ordnen | katalog |
| d6284 | Volumen des Zylinders berechnen | Quiz: Volumen des Zylinders | katalog |
| af2b8 | Volumen des Zylinders berechnen | Volumen berechnen (r = 4,8 cm, h = 9,6 cm) | brian |
| 2859e | Volumen des Zylinders berechnen | Volumen berechnen (r = 3,5 cm, h = 8 cm) | brian |
| af15b | Volumen des Zylinders berechnen | Rechenschritte zum Volumen ordnen | katalog |
| bb6f8 | Anwendungsaufgaben zum Zylinder | Der Getränkebecher | brian |
| 2237e | Anwendungsaufgaben zum Zylinder | Das Etikett der Pfirsichdose | brian |
| 6de22 | Anwendungsaufgaben zum Zylinder | Die Suppendose | brian |
| 495e6 | Anwendungsaufgaben zum Zylinder | Oberfläche, Mantel oder Volumen? Entscheiden | katalog |
| afe87 | Aufbau des Kegels | Schrägbild und Netz des Kegels beschriften | katalog |
| 514e8 | Mantelfläche und Oberfläche des Kegels | Oberfläche mit dem Online-Rechner berechnen | offen, leer |
| d22a0 | Mantelfläche und Oberfläche des Kegels | Rechenschritte zum Mantel ordnen (1 von 2) | katalog |
| b6210 | Volumen des Kegels berechnen | Volumen eines Kegels berechnen | offen |
| abf9a | Volumen des Kegels berechnen | Rechenschritte zum Volumen ordnen (1 von 2) | katalog |
| cbc8c | Anwendungsaufgaben zum Kegel | Der Sandhaufen: Lösungsschritte ordnen | katalog |
| 261ce | Eigenschaften und Oberfläche der Kugel | Oberfläche von Kugeln berechnen (a–c) | brian |
| 7110b | Eigenschaften und Oberfläche der Kugel | Oberfläche einer Kugel mit r = 3 | brian |
| 5ae36 | Volumen der Kugel berechnen | Die Kugel beschriften | katalog |
| 6122a | Volumen der Kugel berechnen | Volumen von Kugeln berechnen (a–f) | brian |
| 416ed | Anwendungsaufgaben zur Kugel | Fehlende Größen in der Kugel-Tabelle ergänzen | brian |
