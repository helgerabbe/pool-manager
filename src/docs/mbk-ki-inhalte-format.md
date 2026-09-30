# Überarbeitete KI-Inhalte zurückmelden (Format `ki-inhalte-1`)

Überarbeitet der Bau einen KI-Schülerinhalt, legt er die neue Fassung ab unter:

`kurse/<slug>/ki-inhalte/<YYYY-MM-DD>.json`

Der Pool-Manager liest beim Abholen der Rückmeldung die jüngste Datei. Jeder Eintrag wird ein Auftrag im Import-Center; erst nach dem Durchführen wird der Inhalt übernommen.

```json
{
  "format": "ki-inhalte-1",
  "einheit_id": "…",
  "erzeugt_am": "2026-09-30T10:00:00Z",
  "inhalte": [
    {
      "id": "intro-sektor-2",
      "baustein_id": "sys_themenfeld_intro",
      "lerntyp": "ehrgeizig",
      "instance_id": "<instance_id des Sektor-Bausteins>",
      "themenfeld_id": "…",
      "hinweis": "Einleitung gekürzt, Beispiel ergänzt.",
      "inhalt": { "titel": "…", "intro": "…", "abschnitte": [{ "emoji": "✨", "ueberschrift": "…", "text": "…" }] }
    }
  ]
}
```

| baustein_id | Pflichtangaben | inhalt |
|---|---|---|
| `sys_themenfeld_intro` | `lerntyp`, `instance_id` | wie im Payload der Sektoreinführung |
| `kompaktwissen` | `aktivitaet_id` | field_values der Aktivität (werden zusammengeführt) |
| `onboarding_einfuehrung`, `onboarding_fragenblock`, `onboarding_einstiegsdiagnose`, `onboarding_lerntyp_diagnose` | — | wie im Onboarding-Payload |

`id` muss innerhalb der Datei eindeutig und stabil sein. Eine neue Revision bitte als neue Datei (neues Datum) ablegen.