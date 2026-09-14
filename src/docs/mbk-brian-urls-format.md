# Rückweg der Brian-Adressen (MBK → Pool-Manager)

Der Bau legt die KI-Tutor-Dialoge in Brian.study selbst an und setzt die Adresse
im Moodle-Kurs direkt ein. Der Pool-Manager kennt sie dadurch aber nicht — und
braucht sie für Vorschau, Schüleransicht und Kontrolle. Deshalb schreibt die MBK
die Adressen zusätzlich in den Austauschordner; der Pool-Manager holt sie
automatisch ab (täglich, plus Knopf im Prüfbereich) und trägt sie in die
zugehörigen Aufgaben ein.

## Ablageort

```
kurse/<kurs-slug>/brian/<YYYY-MM-DD>.json
```

Der Kurs-Slug ist derselbe wie bei den Rückmeldungen (`kurse/<slug>/rueckmeldung/`).
Es gilt immer die **jüngste** `.json`-Datei im Ordner. Erneutes Abholen ist
gefahrlos: gleiche Adresse = keine Änderung.

## Format

```json
{
  "format": "brian-urls-1",
  "erzeugt_am": "2026-09-09T18:20:00Z",
  "kurs": "mathematik-9-bruchrechnen",
  "dialoge": [
    {
      "aufgabe_id": "6a1f…",
      "titel": "Diagramm auswerten",
      "dialog_id": "brian-4711",
      "url": "https://brian.study/d/4711"
    },
    {
      "aufgabe_id": "9c3b…",
      "schritt_id": "s-2",
      "dialog_id": "brian-4712",
      "url": "https://brian.study/d/4712"
    }
  ],
  "onboarding": {
    "pfad": "lerntyp_diagnose.brian_url",
    "url": "https://student.brian.study/#/courses/14981/dialogue/29954/61378"
  }
}
```

### Das Onboarding-Gespräch (optional, seit 2026-09-14)

Die KI-Intensitätsstufen-Diagnose der Orientierungsphase hängt an **keiner
Aufgabe** — sie steckt in der Einheit selbst. Ihre Adresse reist deshalb nicht in
`dialoge`, sondern im eigenen Feld `onboarding` derselben Datei:

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `url` | ja | Adresse des Onboarding-Dialogs in Brian.study. |
| `pfad` | nein | Stelle im Onboarding. Derzeit ist nur `lerntyp_diagnose.brian_url` vorgesehen; ein anderer Pfad wird als Warnung gemeldet und nicht eingetragen. |

Der Pool-Manager schreibt die Adresse nach
`onboarding_konfiguration.lerntyp_diagnose.brian_url` — genau dorthin, wo die
Lehrkraft sie im Export-Center auch selbst pflegt. Damit übersteht sie jeden
weiteren Export und die Korrektur-Krücke im Kursbau kann entfallen.

### Felder

| Feld | Pflicht | Bedeutung |
|------|---------|-----------|
| `aufgabe_id` | ja (empfohlen) | ID der Aufgabe aus dem Übergabepaket. Fehlt sie, wird über `titel` gesucht. |
| `schritt_id` | nur bei Aufgabensequenzen | ID des Brian-Schritts innerhalb der Sequenz — Brian legt pro Dialog eine Aufgabe an, eine Sequenz kann mehrere Gespräche enthalten. |
| `url` | ja | Adresse des Dialogs in Brian.study. Ohne sie wird der Eintrag ignoriert. |
| `dialog_id` | nein | Kennung des Dialogs in Brian.study. |
| `titel` | nein | Aufgabentitel bzw. Dialogname — Rückfallweg für die Zuordnung. |

Alternative Feldnamen werden akzeptiert: `id` für `aufgabe_id`, `brian_url` für
`url`, `brian_dialog_id` für `dialog_id`, und die Liste darf auch `aufgaben`
oder `urls` heißen.

## Was der Pool-Manager damit tut

- Adresse wird in die Aufgabe geschrieben (bei Sequenzen an den jeweiligen Schritt).
- Der Übertragungsstand der Aufgabe geht auf „live".
- Im Prüfbereich (Reiter „Rückmeldung der MBK") erscheint eine Info-Liste:
  welche Brian-Aufgaben schon eine Adresse haben.