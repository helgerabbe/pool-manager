# Antwort an die MBK: Brian-Dialoge entspannt (15.09.2026)

Wir haben die Gesprächsführung des KI-Tutors Brian in **allen bestehenden Einheiten**
verändert. Betroffen sind ausschließlich zwei Elemente jedes Dialogs — alles andere
bleibt wörtlich, wie es war.

## Was geändert wurde

**1. Abschlussregel (`completion_rule` / `brian_completion_rule`) entspannt.**
Bisher forderte fast jede Regel, das Gespräch „erst, wenn … vollständig bearbeitet"
zu beenden. Neu gilt: Das Gespräch endet, **sobald erkennbar ist**, dass die Aufgabe
in den Grundzügen richtig bearbeitet ist; eine Vertiefung wird angeboten, nicht
verlangt. Konkret

- wurde der strenge Satzeinstieg entspannt („Beende das Gespräch erst, wenn …" →
  „Beende das Gespräch, sobald erkennbar ist, dass …"),
- wurden die generischen Wendungen „vollständig beantwortet/bearbeitet/erarbeitet
  hat" zu „in den Grundzügen …",
- und jede Regel endet nun mit dem Satz: *„Es genügt, wenn das in den Grundzügen
  richtig gelungen ist — nicht jeder Aspekt muss vollkommen sein. Biete dem Schüler
  danach locker an, gemeinsam noch tiefer in die Details zu gehen, falls er möchte."*

**Unangetastet blieben** die aufgabenspezifischen Bedingungen der Lehrkräfte
(z. B. „drei begründete Deutungsansätze", „Aufgaben 5, 6 und 7") — sie sind die
fachliche Messlatte, nicht die Strenge.

**2. Betreuungsstil (`tutor_persona`) auf „unterstützend".**
Alle Dialoge stehen jetzt auf `unterstuetzend` (einfühlsam, geduldig, mehr
Hilfestellungen). Zuvor: 39 × `standard`, 8 × leer, 2 × `unterstuetzend`,
1 × `restriktiv`. Das Feld `tutor_persona_zusatz` wurde **nicht** verändert.

## Umfang

| | Anzahl |
|---|---|
| Geprüfte allgemeine Aufgaben | 173 |
| Angepasste Brian-Dialoge | **50** |
| davon Einzelaufgaben (`brian_*`-Felder) | 36 |
| davon Brian-Schritte in Aufgabensequenzen (`sequenz_schritte[].brian`) | 14 |
| davon Dialoge **mit Schlüsselcode** | 3 |
| Übersprungen / fehlerhaft | 0 / 0 |

## Schlüsselcodes sind unverändert

Bei den 3 betroffenen Dialogen bleibt der Schlüsselcode-Anhang
(„Der Dialog endet erst, wenn einer der beiden Schlüsselcodes genannt wurde: … ")
**wörtlich und mit unveränderten Zahlen** erhalten — er steht nach dem entspannten
Teil. Die Abschluss-Regel für die Code-Vergabe (Code erst nach Bearbeitung und
Abschluss-Bewertung) wurde nicht angefasst, damit der Nachweis in der Lernplattform
weiter trägt.

## Übertragungsstand: bitte neu übernehmen

Jeder geänderte Dialog trägt jetzt `brian_sync_status = 'modified'` (bei
Sequenz-Schritten: `schritt.brian.sync_status = 'modified'`). Die **50 Dialoge müssen
in Brian.study neu angelegt bzw. überschrieben werden** — der bisher übertragene
Text ist überholt.

## Auch für künftige Dialoge

Damit neue Dialoge nicht wieder streng entstehen, wurden zusätzlich angepasst:

- **Generator `generateBrianSegments`**: die Vorlage der Abschlussregel (beide
  Zweige — mit und ohne geforderte Abgabeformate) trägt jetzt die entspannte
  Vorgabe; der Standard-Betreuungsstil ist `unterstuetzend`. Die deterministische
  Schlüsselcode-Logik ist unverändert.
- **Globale Prompts**: `guardrail_feedback` erhielt einen Abschnitt „Abschluss von
  Gesprächen (locker)", `global_persona` einen Abschnitt „Tonalität (locker)".
  Die bestehenden Guardrails (nicht demütigend, wertschätzend, Eskalationsstufen)
  bleiben vollständig erhalten — es wurde nur ergänzt, nichts gestrichen.

Die Migration ist idempotent (Erkennung an der Wortmarke „in den Grundzügen"): ein
erneuter Lauf verändert nichts mehr.