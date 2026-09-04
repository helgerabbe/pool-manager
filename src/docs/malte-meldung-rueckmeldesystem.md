# Meldung an die MBK: Das Rückmeldesystem läuft

Stand: 2026-09-04 · zum Weitergeben an die MBK

---

Hallo,

kurze Meldung: **euer Rückmeldeformat wird ab jetzt vom Pool-Manager
ausgelesen.** Ihr müsst dafür nichts umstellen — wir lesen genau die Dateien,
die ihr bereits schreibt.

## Was jetzt passiert

Die Dateien unter `kurse/<kurs-slug>/rueckmeldung/<YYYY-MM-DD>.json` werden
einmal täglich automatisch abgeholt, zusätzlich jederzeit per Knopf im
Pool-Manager. Es gilt immer die **jüngste** `.json` je Kurs; ältere Dateien
bleiben als Historie liegen und werden ignoriert. Die begleitende `.md` lesen
wir gern als Menschen, ausgewertet wird sie nicht.

Beim ersten Lauf heute sind aus fünf Kursen **119 Befunde** und **20 externe
Punkte** angekommen.

Die drei Listen behandeln wir bewusst unterschiedlich:

| Eure Liste | Wohin im Pool-Manager |
|---|---|
| `befunde` | Taskliste der Lehrkräfte, eigener Reiter „Rückmeldung der MBK" — getrennt von unserer eigenen Prüfung |
| `checkliste_extern` | Karte „Offene MBK-Aktionen" für die Administration (Moodle-Abgaben, Prompts) |
| `brian_auftraege` | bewusst nichts — dafür haben wir im Prüfbereich schon einen eigenen Brian-Check |

Die Trennung ist der Kern der Sache: Moodle-Abgaben in der Lehrkraft-Taskliste
würden sie aufblähen, ohne dass die Lehrkraft sie erledigen könnte.

## Was wir aus euren Feldern machen

* `aktivitaet_id` — wir erkennen **selbst**, ob die ID eine Aktivität, ein
  Lernpaket, eine allgemeine Aufgabe oder ein Themenfeld bezeichnet, und
  verlinken die Lehrkraft direkt an die Stelle. Ihr müsst die Art nicht
  mitschicken.
* `aktivitaet`, `themenfeld` — werden Anzeigetitel und Gruppierung der Aufgabe.
* `kategorie` 1–6 übernehmen wir 1:1. Fehlt sie oder ist sie unbekannt, landet
  der Fund bei uns in einer Kategorie 7 „von der MBK gemeldet, ohne Kategorie" —
  er geht also nie verloren.
* `schwere`: `blockiert` / `stört` / `hinweis`. Die Umlaut-Variante ist kein
  Problem. Fehlt sie, nehmen wir `hinweis`.
* `bewusst_exportiert: true` und `status: "erledigt"` überspringen wir. Heute
  waren das 11 Punkte in Mathematik, die dadurch gar nicht erst in der Taskliste
  aufgetaucht sind — genau so soll es sein.

Ein Befund ohne `befund`-Text wird übersprungen; das ist das einzige
Pflichtfeld.

## Die eine Bitte: stabile `id`s

Das ist der wichtige Punkt für uns. Wir erkennen denselben Fund über mehrere
Läufe **allein an der `id`**. Bleibt sie gleich, aktualisieren wir den
bestehenden Eintrag samt Bearbeitungsstand der Lehrkraft. Ändert sie sich,
entsteht bei jedem Bau ein neuer Eintrag und die Liste läuft voll.

Ihre `checkliste_extern`-Punkte haben derzeit keine `id`. Wir bilden dafür
selbst eine stabile Kennung aus `aktivitaet_id` + Text — das funktioniert,
solange der Text sich nicht ändert. Eine eigene `id` dort wäre die sauberere
Lösung, ist aber nicht dringend.

## Was zurückkommt

Die Lehrkraft entscheidet je Befund: **behoben** oder — mit Pflichtbegründung —
**bewusst so gelassen**. Die Begründungen reisen im nächsten Payload zu euch
mit, damit ihr denselben Punkt nicht erneut melden müsst.

Zusätzlich können wir auf Knopfdruck prüfen, ob ein MBK-Fund dieselbe Stelle
betrifft wie einer unserer eigenen. Das markiert nur — gelöscht wird nichts
automatisch, damit kein echter Fund still verschwindet.

## Kurz gesagt

Ihr schreibt weiter wie bisher. Haltet die `id`s stabil und gebt die
`aktivitaet_id` mit, wo es geht — dann kommt jeder Punkt bei der richtigen
Person an, und die E-Mails können entfallen.

Die vollständige technische Beschreibung liegt im Repository unter
`src/docs/mbk-rueckmeldung-format.md`.

Viele Grüße