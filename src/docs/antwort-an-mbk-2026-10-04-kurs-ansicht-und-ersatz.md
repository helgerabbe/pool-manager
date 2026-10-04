# An die MBK: Kurs-Ansicht und umgebaute Aufgaben (2026-10-04)

Ergänzung zur Rückmeldung (`kurse/<slug>/rueckmeldung/<datum>.json`). Zwei neue,
optionale Felder je Befund. Beide werden beim Abholen erkannt und erzeugen im
Import-Center einen Auftrag, den die Fachgruppe freigibt. Nichts wird ohne
Freigabe geändert.

## Fall 1: Gestaltung (Regel 2/3)

Die Stelle sieht im Kurs bewusst anders aus, der Inhalt bleibt gleich.

```json
{
  "id": "gestaltung-kegel-netz",
  "kurs_umgehung": "gestaltung",
  "stelle": { "typ": "aktivitaet", "id": "<ID aus dem Payload>" },
  "schritt_id": "<nur bei Schritten einer Aufgabenfolge>",
  "darstellung": "koerper_netz",
  "befund": "Kegel als ausklappbares Netz statt Standbild.",
  "gestaltung_datei": "kurse/<slug>/gestaltung/<stelle-id>.html"
}
```

- Das HTML ist die fertige Schüleransicht und wird im Pool-Manager 1:1 als
  Kurs-Ansicht gezeigt.
- Wird die Stelle danach bewusst in der Pool-Manager-Fassung neu freigegeben,
  baut ihr wieder nach dieser Fassung.

## Fall 2: Grundlegend umgebaute Aufgabe (Regel 4)

Ihr habt eine Aufgabe ersetzt, z. B. durch einen anderen Aufgabentyp.

```json
{
  "id": "ersatz-pi-erkunden",
  "stelle": { "typ": "allgemeine_aufgabe", "id": "<ID aus dem Payload>" },
  "befund": "Sortieraufgabe durch interaktive Messaufgabe ersetzt.",
  "ersatz_datei": "kurse/<slug>/ersatz/<aufgaben-id>.html"
}
```

- Inhalt der Datei: ein `<div class="aufgabe">` mit eigenem `<style>`/`<script>`,
  ohne `<html>`, `<head>` oder `<body>`. Es ist dasselbe Format wie bei offenen Aufgaben.
- Nach der Freigabe wird die Aufgabe zur offenen Aufgabe mit diesem HTML. Die
  ID bleibt gleich, also auch Lernpfade, Bündel und Lernziele. Im nächsten
  Payload kommt die Aufgabe als offene Aufgabe zurück.

## Für beide Fälle

- Pro Stelle und Datei entsteht genau ein Auftrag. Erneutes Abholen erzeugt
  keine Doppelungen. Eine geänderte Fassung bitte unter neuem Dateinamen liefern.
- Abweichungen ohne HTML bitte weiterhin wie bisher melden.