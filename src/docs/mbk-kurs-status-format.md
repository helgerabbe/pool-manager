# Kurs-Status im Austauschordner (`kurs-status-1`)

Eine Einheit kann im Export-Center **ausgesetzt** werden: Sie bleibt im
Pool-Manager vollständig erhalten, soll aber für Schüler nicht mehr sichtbar
sein — etwa weil sie veraltet ist oder gerade nicht benutzt werden soll. Später
kann die Fachgruppe sie mit einem Klick wieder freischalten.

Damit der Kursbau das beim nächsten Nachlesen erkennt, liegt neben den Payloads
eine kleine Statusdatei:

```
kurse/<slug>/kurs-status.json
```

Sie wird **bei jeder Statusänderung** und **bei jedem Payload-Push** neu
geschrieben. Fehlt die Datei, gilt der Kurs als `aktiv`.

## Inhalt

```json
{
  "format": "kurs-status-1",
  "erzeugt_am": "2026-09-09T20:10:00.000Z",
  "einheit_id": "abc123",
  "slug": "mathematik-9-bruchrechnung",
  "titel": "Bruchrechnung",
  "fach": "Mathematik",
  "jahrgangsstufe": "9",
  "status": "inaktiv",
  "hinweis": "Dieser Kurs ist vorübergehend ausgesetzt. Bitte in Moodle unsichtbar schalten, NICHT löschen …",
  "deaktiviert_am": "2026-09-09T20:10:00.000Z",
  "deaktiviert_von": "lehrkraft@schule.de",
  "grund": "veraltet, wird im Herbst überarbeitet"
}
```

| Feld | Bedeutung |
|---|---|
| `status` | `aktiv` = freigeschaltet, für Schüler sichtbar · `inaktiv` = ausgesetzt |
| `grund` | Klartext der Fachgruppe, nur bei `inaktiv` |
| `deaktiviert_am` / `deaktiviert_von` | wann und von wem ausgesetzt |

## Erwartung an den Kursbau

- `inaktiv` → den Kurs in Moodle **unsichtbar** schalten. **Nicht löschen** und
  nicht abbauen: Payloads und Materialien bleiben im Repository liegen, damit
  ein Wiederfreischalten ohne Neuaufbau möglich ist.
- `aktiv` (nach einer Aussetzung) → den Kurs wieder sichtbar schalten.
- Der Status ist unabhängig von den Payload-Ständen: Eine ausgesetzte Einheit
  darf weiter Payloads schreiben (z. B. während der Überarbeitung), ohne dass
  sie dadurch wieder sichtbar wird.

Erzeugt von `base44/shared/kursStatusDatei.js` (Funktionen
`setEinheitExportAktivSecure` und `pushEinheitToGithub`).