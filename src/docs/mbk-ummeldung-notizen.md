# Merkzettel: Was der MBK gemeldet und im Payload umgebaut werden muss

Stand: 2026-11-11. Laufende Sammelliste. Noch NICHTS davon ist der MBK angekündigt,
die Formatversion des Payloads ist nicht erhöht.

Diese Liste ist aus den Umbauten heraus mitgeschrieben, nicht gegen den Payload geprüft.
Vor der großen Meldung: `src/lib/mbkAirGapPayloads.js` (und `pushEinheitToGithub`,
`base44/shared/aktivitaetInhaltSpecs.js`, `mbk-air-gap-uebergabe.md`) Feld für Feld
gegen diese Liste abgleichen und Fehlendes ergänzen.

## 1. Neuer Aufbau des Lernpakets

- Ein Lernpaket besteht aus drei Teilen: Wissensspeicher, Aufgaben, Abschluss.
- Der Teil "Übung" (Phase `Übung` mit einzelnen Aktivitäten) entfällt. An seine Stelle
  treten Aufgaben (`AllgemeineAufgabe` mit `lernpaket_id`).
- Die bisherigen Übungs-Aktivitäten sind als gelöscht markiert (`sync_status = to_delete`).
  Klären: Wie räumt die MBK sie im Kurs ab, ohne dass Fortschritt verloren geht?
- Umwandlungsregeln: `regeln-uebungen-in-aufgaben-umwandeln.md`.

## 2. Neue Felder an der Aufgabe

- `lernpaket_id`: Aufgabe liegt im Teil "Aufgaben" dieses Lernpakets.
- `reihenfolge_im_lernpaket`: Aufgabe 1, 2, ...
- `niveau` (G / GE / E): ersetzt die Sterne (`schwierigkeitsgrad`). Regelt, in welchen
  Arbeitsplänen die Aufgabe erscheint.
- `pflicht` (true / false): Pflicht- oder Wahlaufgabe.
- `themenfeld_platz` (`einstieg` / `gesamtaufgabe`): Aufgabe am Anfang bzw. Ende eines
  Themenfelds, außerhalb der Lernpakete. Position im Kurs und im Arbeitsplan klären.

## 3. Varianten am Element

- `sequenz_schritte[i].varianten`: weitere gleichwertige Fassungen neben `field_values`
  (= Variante 1). Jeder Schüler bekommt zufällig genau eine.
- Fortschritt hängt an der id des Schritts, nicht an der Variante.
- `zufallsauswahl_anzahl` an der Aufgabe ist Altbestand, bleibt 0, wird nicht mehr ausgewertet.
- Solange die MBK das Feld nicht kennt, baut sie nur Variante 1.
- Es reisen nur freigegebene Varianten mit. Entwürfe (`entwurf: true`) und leere Varianten
  bleiben im Pool-Manager. Ein Element ist vollständig, sobald eine freigegebene Variante
  Inhalt hat.
- Abschluss-Elemente (Test, über `MasterAufgabe`) folgen seit 2026-11-11 derselben Regel:
  freigegeben und vollständig, sobald EINE Variante freigegeben ist. In `master_aufgaben`
  reisen dann nur noch die freigegebenen Varianten mit (gibt es noch keine, wie bisher alle).
  Der MBK melden: Die Liste kann kürzer sein als im Pool-Manager angelegt.

## 4. Abschluss und Erledigt-Regeln

- Standard-Abschluss ist "Automatisch erledigt" (alle sichtbaren Pflichtaufgaben bearbeitet).
  "Bearbeitung bestätigen" gibt es nicht mehr.
- Lernpaket ohne Aufgaben gilt sofort als erledigt.
- Abschluss-Elemente mit Varianten (z. B. Test): alle Varianten gleichberechtigt, zufällig
  eine je Schüler. Die Wahl "mischen / fest" (`master_anzeige_modus`) ist aus der Oberfläche entfernt.
- Kompaktwissen ist kein Pflichtelement mehr im Wissensspeicher (löschbar).

## 5. Begriffe

- "Masteraufgabe" heißt überall "Variante". Texte im Export, in den Format-Beschreibungen
  und in den MBK-Dokumenten anpassen.
- "Übung" im Lernpaket heißt "Aufgabe".

## 6. Im Pool-Manager selbst noch nachzuziehen

- Prüfbereich: Vollständigkeitsprüfung schaut nur auf Variante 1 eines Elements.
- Prüfbereich, Arbeitsplan und Export müssen Aufgaben im Lernpaket vollständig erkennen.
- Themenfeld-Plätze automatisch im Arbeitsplan positionieren.

## 7. Beim Abgleich mit dem Payload zusätzlich prüfen

- Kompetenzkarte (`sys_kompetenzkarte`) und Online-Test (`sys_external_test`): reisen sie mit,
  kennt die MBK sie?
- Sektor-Typen (Einführung, Arbeit, Prüfung, Projekt) und Freischaltung.
- Alle Stellen, an denen der Payload noch `schwierigkeitsgrad`, Phase `Übung` oder
  `zufallsauswahl_anzahl` ausgibt.
