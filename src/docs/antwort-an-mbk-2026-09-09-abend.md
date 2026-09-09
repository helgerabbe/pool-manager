# Antwort an die MBK, 9. September 2026 (nachts)

Auf euren Stand vom Abend. Kurz und in derselben Reihenfolge.

## 1. Der Namensunterschied ist keiner

Bleibt bei `quelle` — wir lesen dieses Feld bereits. `mbk_quelle` ist nur der
Spaltenname in unserer Datenbank; der Leser nimmt `quelle` mit den Werten `bau`
und `sichtung`. **Bitte nichts umbauen.**

## 2. `kurs_felder`: übernommen

Wir lesen die Liste ab jetzt mit und zeigen sie der Lehrkraft direkt am Befund
an („Der Kurs überschreibt hier: Arbeitsauftrag, Material 1"). Damit weiß sie,
warum ihre Änderung im Kurs nicht ankommt — genau das war der Zweck von T7. Ein
zusätzliches Feld in eure Richtung brauchen wir nicht.

## 3. Brian-Adressen: der Ordner kommt von euch

Missverständnis auf unserer Seite — wir haben das Format nie geschickt.
Zuständigkeit: **Ihr schreibt, wir lesen.** Ablage:

```
kurse/<slug>/brian/<datum>.json      Format "brian-urls-1"
```

```json
{
  "format": "brian-urls-1",
  "kurs": "<slug>",
  "erzeugt_am": "2026-09-09T20:00:00Z",
  "dialoge": [
    {
      "aufgabe_id": "abc123",
      "schritt_id": "s-2",
      "dialog_id": "brian-4711",
      "url": "https://brian.study/d/4711"
    }
  ]
}
```

`aufgabe_id` ist die ID der Aufgabe aus dem Payload. `schritt_id` nur bei
Aufgaben im Sequenz-Modus (ein Brian-Schritt = ein Dialog), sonst weglassen.
`dialog_id` optional, `url` ist das Entscheidende. Wir übernehmen die Adressen
automatisch und schreiben sie beim nächsten Export als `brian_dialog.url` an die
Aufgabe zurück — genau da, wo ihr sie erwartet. Die vollständige Beschreibung
liegt bei uns unter `src/docs/mbk-brian-urls-format.md`; wenn ihr sie im Repo
haben wollt, legen wir sie dort ab.

## 4. Neu bei uns: ausgesetzte Kurse

Eine Einheit kann im Pool-Manager vom Export **ausgesetzt** werden — sie bleibt
erhalten, soll aber für Schüler nicht mehr sichtbar sein. Dafür liegt neben den
Payloads:

```
kurse/<slug>/kurs-status.json        Format "kurs-status-1"
```

mit `"status": "aktiv" | "inaktiv"`, Begründung, Zeitpunkt und Person. Bitte bei
`inaktiv` den Kurs **unsichtbar schalten, nicht löschen** — die Fachgruppe kann
ihn jederzeit wieder freischalten, und ein Neuaufbau soll dafür nicht nötig
sein. Fehlt die Datei, gilt der Kurs als aktiv. Beschreibung:
`src/docs/mbk-kurs-status-format.md`.

## 5. Drei Fehler auf unserer Seite, behoben

Ab **airgap-1.22.0**:

- `lernpaket_zugang` steht jetzt zusätzlich am Lernpaket selbst, als
  `zugang_je_lerntyp` (ein Wert pro Intensitätsstufe). Am Pfad-Item bleibt es
  wie bisher — dort ist es der effektive Wert dieser Stelle.
- Die Intensitätsstufen-Diagnose liefert ihre Adresse jetzt als `url`
  (`brian_url` bleibt zusätzlich stehen, damit euer Leser nicht bricht).
- `meta.aenderungen` ist neu — siehe nächster Punkt.

## 6. Schema-Änderungen: beides, wie gewünscht

- **`meta.aenderungen`** steht ab 1.22.0 in jedem Payload: Version,
  Vorversion und ein Satz je geändertem Feld.
- **Ticket-Issue** (Label `ticket` + `engine`) einen Tag vor dem ersten Export
  mit neuer Version, mit derselben Stichpunktliste.

## 7. Kurssprache: verstanden, wird ein eigenes Vorhaben

Berechtigter Punkt, und der Aufwand liegt klar bei uns: Unsere Textgeneratoren
erzeugen grundsätzlich Deutsch. Wir bauen eine **Unterrichtssprache an der
Einheit** ein, die in alle Schülertexte durchreicht (Kompaktwissen,
Arbeitsaufträge, Themenfeld-Einführungen, Systembaustein-Aufträge) — mit den von
euch genannten Ausnahmen (Vokabelhilfen, Sprachzuordnungen, Lernziele deutsch).
Die 17 gemischten Themenfeld-Einführungen können nur wir reparieren; sie werden
in der Zielsprache neu erzeugt. Bitte die Korrekturschicht dafür noch stehen
lassen, bis wir Bescheid geben.

## 8. Leere Inhalte und interne Notizen

Die drei leeren Kompaktwissen und der deutsche Lehrer-Check-Auftrag sind
inhaltliche Lücken der Fachgruppe — wir gehen der Frage nach, warum unsere
Vollständigkeitsprüfung sie vor dem Export nicht blockiert hat. Euren Vorschlag
zu den internen Notizen nehmen wir auf: Klammerblöcke, die den Kursbau
ansprechen, und Materialbeschriftungen, die wie Dateinamen aussehen, werden zu
eigenen Prüfregeln.