# Antwort an den Kursbau · Fertig-Signal freigegebener HTML-Interaktionen

**Pool-Manager → Kursbau · 2026-09-15**
Bezug: `2026-09-14-mbk-an-pm-freigegebene-interaktionen-fertig-signal.md`, GitHub-Issue #62 (Meldung 57)

## Entschieden: aufgenommen

Die Zeile ist ab heute Teil der Bauanweisung. Jedes künftig erzeugte Fragment
ruft an seiner Abschlussstelle zusätzlich auf:

```js
parent.postMessage({ mbkFertig: true }, "*");
```

Die Anweisung lautet wörtlich (in beiden Erzeugungswegen identisch):

> FERTIG-SIGNAL (Pflicht): Genau an der Stelle, an der die Aufgabe ihren
> Abschluss anzeigt (alles richtig zugeordnet, „Prüfen" gedrückt, Bilanz
> erscheint), rufe zusätzlich `parent.postMessage({ mbkFertig: true }, "*");`
> auf. Mehrfaches Senden ist unschädlich; die Plattform wertet nur „fertig oder
> nicht" und braucht keine Antwort. NICHT senden bei „Nochmal von vorne",
> „Neu mischen" oder „Zurücksetzen".

Der ausdrückliche Ausschluss der Zurücksetzen-Knöpfe steht mit Absicht dabei —
er entspricht genau der Regel, nach der eure Heuristik heute schon arbeitet.

## Wo die Zeile jetzt steht

Fragmente entstehen im Pool-Manager auf **zwei** Wegen, die dieselbe Bauordnung
tragen. Beide haben die Zeile bekommen, damit keine Lücke entsteht:

1. **Aufgabenwerkstatt** (Gespräch der Lehrkraft mit dem Baumeister) —
   `base44/functions/aufgabeGeneratorChat`, Abschnitt „DIDAKTIK".
2. **Didaktiker** (Einweg-Bau beim Aufbau eines Basispakets) —
   `base44/shared/didaktikerOffeneAufgabe.js`, `BAU_SYSTEM_PROMPT`.

## Was das für den Bestand bedeutet

Nichts. Die 48 vorhandenen Fragmente werden **nicht** neu erzeugt; für sie
bleibt euer Raten die Grundlage. Wird ein Fragment aus einem anderen Anlass
ohnehin neu gebaut oder überarbeitet, nimmt es die Zeile automatisch mit.
Rechnet also mit einem allmählichen Übergang, nicht mit einem Stichtag.

Ein Vorbehalt, den wir offen benennen: Die Zeile ist eine Anweisung an ein
Sprachmodell, keine Garantie. In der Regel wird sie sitzen, aber sie kann im
Einzelfall fehlen oder an der falschen Stelle stehen. Behaltet euer Raten
deshalb bitte als Netz — die Kombination aus beidem ist zuverlässiger als jedes
der beiden allein.

## Nicht Teil dieser Umsetzung

- **`mbkBegonnen`**: wie von euch vorgeschlagen zurückgestellt. Sagt Bescheid,
  wenn es aktuell wird; die Stelle in der Vorlage ist dieselbe.
- **Unsere eigene Schüleransicht**: Der Pool-Manager bettet dieselben Fragmente
  in seiner Vorschau und in der internen Schüleransicht ein. Dort hört noch
  niemand auf die Nachricht — sie verpufft folgenlos. Dass wir das nachziehen
  könnten, ist uns bewusst; es ist als eigene Aufgabe vermerkt und berührt euren
  Kurs nicht.

Danke für die klare Eingrenzung auf „fertig oder nicht" — dass kein Zustand und
kein Schlüssel zurückreisen muss, hat die Entscheidung einfach gemacht.