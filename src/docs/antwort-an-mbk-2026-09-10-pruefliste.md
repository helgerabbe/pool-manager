# Antwort an die MBK — Prüfliste geschrumpft (10.09.2026)

Hallo,

danke für die Liste. Wir haben alle fünf Punkte umgesetzt. Beim nächsten
Prüflauf einer Einheit verschwinden die alten Fehlmeldungen von selbst — es ist
nichts zu tun, außer den Lauf einmal zu starten.

## 1. Brian-Aufgaben: keine Fehlmeldungen mehr bei Einzelaufgaben

Bisher galt **jede** Aufgabe vom Typ „inhalt" pauschal als KI-Tutor-Aufgabe. Der
Pool-Manager hat dann vier fehlende Brian-Felder gemeldet, obwohl dort nie ein
Gespräch geplant war — das waren die rund 84 Fehlmeldungen über alle Kurse.

Neue Regel: Als Brian-Aufgabe gilt eine Stelle nur noch, wenn dort tatsächlich
ein Gespräch angelegt ist:

- **Aufgabenfolge:** es gibt mindestens einen Schritt vom Typ „KI-Tutor".
- **Einzelaufgabe (Altbestand):** mindestens ein Brian-Feld, eine Dialog-Kennung
  oder eine Brian-Adresse ist gefüllt.

Dieselbe Regel gilt jetzt auch im Export-Payload (`brian_dialog`), damit Prüfung
und Kursbau exakt dieselben Aufgaben als Brian-Aufgaben ansehen.

## 2. Handlungsaufgaben sind keine Brian-Aufgaben

Handlungsaufgaben werden an echtem Material bearbeitet (Arbeitsheft, Buch) und
schülerseitig nur bestätigt. Sie sind von der Brian-Prüfung ausgenommen; in der
Schüleransicht erscheint dort kein KI-Tutor-Hinweis mehr, sondern der
Materialhinweis.

## 3. Vier-Felder-Prüfung abgestuft: blockierend vs. Hinweis

Nur noch zwei Felder halten eine Aufgabe auf, weil sie niemand außer der
Lehrkraft schreiben kann:

- **blockierend:** Dialogname, Anweisung für Lernende
- **nur Hinweis:** interne Anweisung für den Chatbot, Abbruchbedingung

Die beiden Hinweis-Felder stehen im Brian-Cockpit weiterhin grau dabei
(„ergänzt das Moodle-Team notfalls selbst"), zählen aber nicht mehr gegen die
Vollständigkeit und blockieren die Freigabe nicht.

## 4. Systembaustein-Befunde aus der Taskliste entfernt

Fehlende interne Inhalte (Einführung in den Sektor, Onboarding, Diagnose) sind
keine Arbeit der Lehrkraft — sie werden im Export-Center per Knopf erzeugt bzw.
entstehen beim Bau. In der Taskliste standen sie in jeder Einheit dutzendfach
und haben die echten Fundstellen verdeckt. Sie werden nicht mehr gemeldet; die
Erzeugung selbst bleibt unverändert.

## 5. Prüfbereich: Anzeige und Reiter

- Die MBK-Befunde zeigen jetzt **zwei Zahlen**: offen und gelöst. Erledigte
  Punkte (behoben / bewusst gelassen / Widerspruch) liegen zusammengeklappt in
  einer eigenen Übersicht „Gelöste Punkte".
- Der aktive Reiter bleibt beim Neuladen stehen (steht in der Adresse), und die
  Zähler aktualisieren sich nach jeder Entscheidung sofort.

## Was wir von euch bräuchten

Wenn nach dem nächsten Bau noch Meldungen übrig sind, die aus einer der oben
genannten Kategorien stammen, schickt sie uns bitte mit `fundort` — dann sehen
wir sofort, welche Stelle gemeint ist.

Viele Grüße
Die Fachgruppe (Pool-Manager)