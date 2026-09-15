# Antwort an den Kursbau · Neue Payload-Bausteine, Ankündigung und Feldnamen

**Pool-Manager → Kursbau · 2026-09-15**
Bezug: `2026-09-10-mbk-an-pm-neue-schritt-typen-und-slideshow.md`

Zuerst: Der Befund ist berechtigt, und die Kritik trifft uns, nicht euch. 65 Schritte
und zehn Folienstrecken sind ohne Vorwarnung bei euch angekommen. Dass ihr das
gefunden habt, weil jemand Dateigrößen angesehen hat, ist der eigentliche
Skandal an der Sache — nicht der fehlende Generator-Zweig.

Alle fünf Punkte sind umgesetzt. Einer davon anders, als ihr ihn vorgeschlagen
habt; das begründen wir unten.

## 1 + 3 · Die Liste der Schritt-Typen und Aktivitätsnamen

**Es gibt sie schon — und ab jetzt ist sie auch verlässlich aktuell.**

Im Repository liegen zwei Dateien:

- `bausteine/katalog.json` — maschinenlesbar, Format `bausteine-1`
- `bausteine/README.md` — dieselben Daten als Tabelle

Der aktuelle Stand ist gerade geschrieben worden: **8 Schritt-Typen, 29
Aktivitäten**. Genau die Fassung, die ihr unter Punkt 3 als „beste Fassung von
Punkt 1" beschrieben habt: Jede Aktivität steht mit ihrer
`aktivitaet_katalog_id`, ihrem Namen, ihrer Phase und den erwarteten Schlüsseln
in `field_values` — inklusive der Angabe, welche davon Pflicht sind. Jeder
Schritt-Typ steht mit seinem Nutzdaten-Block und dessen Feldern.

Die Datei war schon vorhanden, wurde aber nur geschrieben, wenn jemand im
Import-Center den Knopf drückte. Genau darin lag euer Problem: Der Baustein
existierte, die Liste war alt. **Ab jetzt schreibt ein Automatismus die beiden
Dateien neu, sobald sich am Aktivitätenkatalog irgendetwas ändert** — ein neuer
Eintrag, ein umbenanntes Feld, ein deaktiviertes Format. Ihr sollt sie also
nicht mehr „hoffentlich aktuell" vorfinden, sondern aktuell.

Damit könnt ihr beim Bauen prüfen und melden statt schweigen. Wenn ihr in
`katalog.json` etwas findet, das euch unklar ist, ist das ein Fehler in unserer
Beschreibung — sagt es uns.

## 2 · Ankündigung mit Beispiel

Wir hatten seit dem 9. September eine Ankündigung (Stichpunktliste in
`meta.aenderungen` und ein Issue mit Label `ticket` + `engine`). Ihr habt recht,
dass die nicht reicht: Sie sagt, DASS ein Baustein neu ist, nicht, wie er
aussieht — die Form musstet ihr weiter aus dem ersten Export erraten.

**`meta.aenderungen` hat jetzt ein Feld `beispiele`.** Jeder Eintrag darin
nennt, was neu ist, in welchem Payload und an welcher Stelle es steht, und
zeigt ein vollständiges Beispiel-Objekt. Dasselbe steht als JSON-Block im
Ankündigungs-Issue. Bei einer Version ohne neuen Baustein ist das Feld ein
leeres Array — dann gibt es nichts zu zeigen.

## 4 · `system_prompt` vs. `system_instruction`

Wir haben nachgesehen. Die Abweichung ist **ein Feld in einem einzigen
Katalog-Eintrag**: „KI-Tutor Aufgabe (Brian)" führt in seinem Formular
`system_prompt`, während Aufgabe, Sequenzschritt und der restliche Payload
`system_instruction` sagen. `dialog_name` und `completion_rule` stimmen längst
überein; `instruction` ist das generische Aufgabenstellungs-Feld aller 29
Formate und bleibt bewusst so.

**Wir haben NICHT umbenannt, sondern den Wert unter beiden Namen ausgeliefert.**
Der Grund: An diesem Feld hängen **49 von Lehrkräften geschriebene Prompts**,
teils mehrere Tausend Zeichen. Eine Umbenennung hätte jeden dieser Texte
angefasst. Für die Sauberkeit eines Feldnamens ist uns das Risiko, die Arbeit
von Kolleginnen zu beschädigen, zu hoch — der Gewinn wäre eurer, das Risiko
unseres.

Ab `airgap-1.23.0` steht in `field_values` dieser Aktivität also:

```json
{
  "instruction": "Diskutiere mit Brian, ob Nathanael selbst schuld ist.",
  "system_instruction": "Du bist ein sokratischer Gesprächspartner …",
  "system_prompt": "Du bist ein sokratischer Gesprächspartner …",
  "dialog_name": "Der Sandmann – Schuldfrage",
  "completion_rule": "Fertig, wenn drei Argumente belegt wurden."
}
```

**Lest `system_instruction`** — der Name gilt dann überall. `system_prompt`
bleibt unverändert daneben stehen, damit euer bestehender Leser nicht bricht;
wir lassen ihn irgendwann still fallen und sagen es vorher an. Geprüft an den
echten Daten: 49 Datensätze bekommen das gespiegelte Feld, 17 leere bleiben
leer, kein anderes Format ist betroffen. In unserer Datenbank ändert sich nichts.

## 5 · Verstecktes HTML in `fragment`

Aufgenommen. Beide Wege, auf denen bei uns Fragmente entstehen
(Aufgabenwerkstatt und Didaktiker), verlangen jetzt ausdrücklich:

> Hilfselemente, die (noch) nicht sichtbar sein sollen — Overlays,
> Kopier-Textfelder, Ergebnisboxen —, verbirg mit `display: none`. NIEMALS mit
> `position: absolute` weit außerhalb des Bildschirms parken: Der Kurs misst
> die Höhe der Aufgabe an ihrem Inhalt und reserviert dann ein Vielfaches der
> wirklich gebrauchten Höhe.

Wie beim Fertig-Signal gilt: Das wirkt auf **neu erzeugte** Fragmente. Die
vorhandenen behalten ihre Off-Screen-Helfer — euer Fix (609629c) bleibt also
nötig, und wir bitten euch, ihn zu behalten.

## Was das Grundproblem angeht

Zwei Dinge bleiben ehrlicherweise offen:

**Die Liste hilft nur, wenn euer Bau sie liest.** Wir können veröffentlichen,
was wir kennen; ob ein unbekannter Typ bei euch laut wird, entscheidet euer
Generator. Ihr habt das mit `bauinfo/checkliste.md` schon angefangen — wenn
`katalog.json` euch dabei nützt, sagt uns, welche Form ihr braucht.

**Prompt-Regeln sind keine Garantien.** Fertig-Signal und `display: none`
sind Anweisungen an ein Sprachmodell. In der Regel sitzen sie, im Einzelfall
nicht. Behaltet eure Heuristiken als Netz.

Danke für die genaue Meldung — besonders für die Tabelle mit den Stückzahlen.
Daran war sofort erkennbar, wo wir hinsehen mussten.