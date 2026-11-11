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

- Niveau und Pflicht oder Wahl gelten für alle Elemente gemeinsam.
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
