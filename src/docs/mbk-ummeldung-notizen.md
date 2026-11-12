# Merkzettel: Was der MBK gemeldet und im Payload umgebaut werden muss

Stand: 2026-11-12. Die Abschnitte 1 bis 5, 8 und 9 sind der MBK mit `airgap-1.26.0`
gemeldet (Ticket #166, https://github.com/IGS-Seevetal/Poolzeit/issues/166). Die Texte
darunter sind der Stand vor der Meldung; „noch nicht gemeldet“ gilt dort nicht mehr.

## Gemeldet und im Payload umgebaut: airgap-1.26.0 (2026-11-12)

Wortlaut der Meldung: `src/lib/airGapAenderungen.js` (15 Punkte, drei Beispiele). Sie reist
auch in jedem Payload unter `meta.aenderungen` mit.

Am Payload geändert (`src/lib/mbkAirGapPayloads.js`, `src/lib/mbkPayloadBasis.js`):

- **Fehler behoben:** Aufgaben im Lernpaket mit Ebene 1 fehlten in Payload 3 ganz, weil die
  Export-Wege nur Ebene 2 und 3 durchließen. Bei Exploring Australia waren das 85 von 99
  Aufgaben. Jetzt reist jede Aufgabe in einem Lernpaket oder an einem Themenfeld-Platz mit
  (`istExportAufgabe`).
- Ausgeblendete Lernpakete (`to_delete`) reisen in keinem Payload mehr mit, samt Lernzielen,
  Aktivitäten und Aufgaben. Verweise darauf im Arbeitsplan entfallen.
- Payload 2: `aufgaben` am Lernpaket, `plaetze` am Themenfeld. Datei-Zuordnung: alle Aufgaben
  eines Lernpakets stehen in `contained_aufgabe_ids` seiner Datei, nicht mehr im
  Themenfeld-Bündel.
- Payload 3: `aufgabe_ids` am Lernpaket, `braucht_nacharbeit` an der Aufgabe. Aufgaben im
  Lernpaket erben das Zurück-Ziel ihres Lernpakets.
- Payload 4: KI-Aufgaben im Lernpaket zielen auf die Datei des Lernpakets.
- `zufallsauswahl_anzahl` wird immer als 0 ausgegeben.

Geprüft: Payloads 2 bis 4 für Exploring Australia, Kurzgeschichten und Kreis und Körper aus
den echten Daten erzeugt. Jede sichtbare Aufgabe steht genau einmal in Payload 2, Payload 3
und der Datei-Zuordnung; kein Verweis im Arbeitsplan zeigt auf ein fehlendes Lernpaket.
Nicht geprüft: die Oberfläche des Export-Centers und der Weg nach GitHub.

Weiter offen:

- Antwort der MBK: Wie räumt sie Ausgeblendetes im Kurs ab, ohne dass Fortschritt verloren geht?
- `master_anzeige_modus` reist weiter mit, obwohl die Wahl aus der Oberfläche entfernt ist.
- Kurzgeschichten: Im Arbeitsplan steht ein Eintrag, dessen Art der Export nicht erkennt
  (`item_kind` leer). Bestand schon vorher.
- Abschnitt 6 und 7 unten.

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

- `sequenz_schritte[i].aufgabe.bild_url` (2026-11-11): optionales Bild zu einer Freitextfrage,
  steht über der Aufgabenstellung. Der MBK noch nicht gemeldet; prüfen, ob es im Payload mitreist.
- Freitextfrage (`typ = aufgabe`) mit Texteingabe: `musterloesung` ist jetzt Pflicht, auch bei
  `feedback_modus = ki` (Grundlage der KI-Rückmeldung).

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
- Arbeitsplan und Export müssen Aufgaben im Lernpaket vollständig erkennen. Der Prüfbereich
  ordnet Befunde zu Aufgaben im Lernpaket seit 2026-11-11 dem Lernpaket zu.
- Themenfeld-Plätze automatisch im Arbeitsplan positionieren.

## 7. Beim Abgleich mit dem Payload zusätzlich prüfen

- Kompetenzkarte (`sys_kompetenzkarte`) und Online-Test (`sys_external_test`): reisen sie mit,
  kennt die MBK sie?
- Sektor-Typen (Einführung, Arbeit, Prüfung, Projekt) und Freischaltung.
- Alle Stellen, an denen der Payload noch `schwierigkeitsgrad`, Phase `Übung` oder
  `zufallsauswahl_anzahl` ausgibt.

## 8. Projektaufgaben sind jetzt Lernpakete (2026-11-11)

Schon gemeldet (`airgap-1.25.0`):

- `art` am Themenfeld (`inhalt` / `projekt`). `projekt` = das feste Themenfeld
  "Projektaufgaben": höchstens eines je Einheit, immer zuletzt, kein Lernstoff (nicht auf
  der Lernlandkarte, keine Arbeitsphase). Ohne Projekt reist es nicht mit.
- `ist_projekt` am Lernpaket. Ein Projekt-Lernpaket hat kein Kompaktwissen, keine eigenen
  Lernziele, keinen Wissensspeicher und keinen Abschluss. Es besteht nur aus seinen Aufgaben.

Seitdem dazugekommen, der MBK noch NICHT gemeldet:

- Der Umzug ist erledigt: Alle bisherigen Projektaufgaben (Ebene 3) liegen jetzt in je einem
  eigenen Projekt-Lernpaket (`lernpaket_id` gesetzt, Niveau E). Die Ankündigung zu 1.25.0
  sagt noch "reisen weiter im Projekt-Bündel, bis sie umgezogen sind".
- Im Arbeitsplan verweist der Projektbereich (Sektor-Typ `projekte`, Projektbündel) jetzt auf
  die Lernpaket-ID statt auf die Aufgaben-ID. Betrifft 22 Einträge in 9 Einheiten, nur in den
  Plänen Ehrgeizig und Passioniert. Die Aufgaben-IDs selbst sind unverändert.
- Ein Projekt gilt als erledigt, wenn alle sichtbaren Pflichtaufgaben des Projekt-Lernpakets
  bearbeitet sind (gleiche Regel wie "Automatisch erledigt").
- Vollständig ist ein Projekt-Lernpaket, wenn es mindestens eine Aufgabe hat und alle
  Aufgaben vollständig oder freigegeben sind. Ein leeres Projekt meldet der Prüfbereich
  als "Noch leer" (Kategorie 1, blockiert).
- Rückmeldungen der MBK zu einer Projektaufgabe bitte weiter mit der Aufgaben-ID melden.
  Der Pool-Manager zeigt sie am Projekt-Lernpaket.

Mit der MBK zu klären, bevor wieder gebaut wird:

- Projekt-Bündel: Seit 2026-11-11 stehen Projektaufgaben mit `lernpaket_id` nicht mehr in
  `projekte-einheit-<einheit_id>.html`. Sie stehen in `contained_aufgabe_ids` am
  Mapping-Eintrag ihres Lernpakets (kind `lernpaket`), KI-Aufgaben zusätzlich in dessen
  `placeholder_activity_ids`. Das Bündel enthält nur noch Projektaufgaben ohne Lernpaket und
  entfällt sonst. Die Version blieb `airgap-1.25.0`, der Änderungstext dazu ist angepasst.
  Klären: Ist 1.25.0 der MBK schon angekündigt? Dann neu ankündigen oder Version erhöhen.
- Wie baut die MBK ein Lernpaket ohne Aktivitäten (nur Aufgaben)? Bisher gab es das nicht.
- Fortschritt: Schüler, die eine Projektaufgabe im alten Projekt-Bündel schon bearbeitet
  haben, dürfen ihren Stand beim Umbau nicht verlieren.
- Exploring Australia (Passioniert): Zwei Projekt-Lernpakete liegen in Arbeitsphasen der
  Themenfelder statt im Projektbereich. Kann die MBK ein Projekt-Lernpaket dort einhängen?
  (Seit 2026-11-11 überholt: Passioniert ist jetzt die Kopie von Ehrgeizig, siehe 9.)

## 9. Ein Arbeitsplan je Niveau (2026-11-11)

Noch nicht an die MBK gemeldet.

- **G-Niveau:** Minimalist und Pragmatiker haben einen gemeinsamen Arbeitsplan. Bearbeitet
  wird nur der Pragmatiker-Plan. Der Minimalist-Plan ist dieselbe Sektorfolge ohne das, was
  nur der Pragmatiker hat: die Kompetenzkarte im Einstieg und den Abschlusstest (Online-Test)
  am Ende. Regel in `src/lib/eNiveauPlan.js` (`minimalistAus`).
- **E-Niveau:** Passioniert ist die Kopie von Ehrgeizig (wie seit 2026-11-10). Nach der
  schriftlichen Arbeit folgt der Projektbereich.
- **Im Export** bleiben alle vier Lerntypen als eigene Pläne enthalten; Minimalist und
  Pragmatiker bzw. Ehrgeizig und Passioniert haben dabei dieselben Sektor-Kennungen.
- **Umstellung am 2026-11-11, alle Einheiten mit Arbeitsplan (17):** Der Minimalist-Plan wurde
  durch den Pragmatiker-Plan ersetzt. Nur gemeinschaftliche Einheiten: fehlender Abschlusstest
  beim Pragmatiker ergänzt (Berufliche Selbstverwirklichung, Architektur, Grundlagen
  Musiktheorie und Epochen, Design), fehlender Projektbereich bei Ehrgeizig ergänzt
  (Architektur, Design, Kreis und Körper; leer, gesperrt bis zur Freigabe), Passioniert an
  Ehrgeizig angeglichen. Die vorherigen Pläne aller 17 Einheiten liegen als private Datei:
  `mp/private/69cb7e99726da2a1d81bee50/ded57af8d_lernpfade_backup_2026-11-11.json`.
- **Offen:** Fortschritt von Schülern im alten Minimalist- oder Passioniert-Plan hängt an
  Sektoren, die es dort jetzt nicht mehr gibt.
