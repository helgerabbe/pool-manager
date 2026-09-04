# Rückmeldung der MBK an den Pool-Manager — Format

Stand: 2026-09-04 · Format-Version **1** · Diese Datei ist die verbindliche
Spezifikation, die der MBK übergeben wird.

## Warum das so läuft

Bisher kamen Rückmeldungen des Baus per E-Mail und mussten von Hand an die
zuständigen Lehrkräfte weitergeleitet werden. Der Pool-Manager hat mit dem
Prüfbereich (Reiter 8) längst eine Taskliste, in der genau solche Punkte
abgearbeitet werden. Statt der E-Mail legt die MBK ihre Funde deshalb als Datei
im Repository ab; der Pool-Manager holt sie ab und legt sie in dieselbe
Taskliste — in einen eigenen Reiter „Rückmeldung der MBK".

## Ablageort

```
kurse/<kurs-slug>/rueckmeldung/<YYYY-MM-DD>.json
kurse/<kurs-slug>/rueckmeldung/<YYYY-MM-DD>.md    (optional, für Menschen)
```

* `<kurs-slug>` ist derselbe Ordner, in dem die Payloads liegen.
* Der Pool-Manager liest **immer die jüngste `.json`** je Kurs. Ältere Dateien
  bleiben als Historie liegen und werden ignoriert.
* Die `.md` ist willkommen, wird aber nicht ausgewertet.

## Aufbau der JSON-Datei

```json
{
  "format_version": 1,
  "erzeugt_am": "2026-09-02T10:15:00Z",
  "kurs_slug": "englisch-9-exploring-australia",

  "befunde": [
    {
      "id": "2026-09-02-001",
      "kategorie": 1,
      "schwere": "blockiert",
      "stelle": {
        "ziel_typ": "systembaustein",
        "ziel_id": "sys_themenfeld_intro",
        "ref_titel": "Einführung in das Themenfeld „Nature and Wildlife\"",
        "lernpaket_titel": "Exploring the Outback",
        "themenfeld_titel": "Nature and Wildlife"
      },
      "befund": "Der Systembaustein hat keinen Text — im Kurs bleibt die Seite leer.",
      "vorschlag": "Einführungstext im Pool-Manager erzeugen und sichten."
    }
  ],

  "externe_punkte": [
    {
      "id": "2026-09-02-ext-01",
      "art": "moodle",
      "anzahl": 6,
      "titel": "Moodle-Abgaben anlegen",
      "beschreibung": "Für sechs Projektaufgaben fehlen die Abgabe-Aktivitäten in Moodle."
    }
  ]
}
```

### Die beiden Listen sind bewusst getrennt

| Liste | Bedeutung | Landet im Pool-Manager |
|---|---|---|
| `befunde` | Etwas an einer **Stelle der Einheit** trägt nicht. Eine Lehrkraft kann es beheben. | Taskliste Reiter 8 → „Rückmeldung der MBK" |
| `externe_punkte` | Etwas muss **außerhalb** des Pool-Managers getan werden (Moodle, Prompts, Technik). | Karte „Offene MBK-Aktionen" für die Administration |

Bitte nicht mischen: Externe Punkte in der Lehrkraft-Taskliste blähen sie auf,
ohne dass die Lehrkraft sie erledigen könnte.

### Feld für Feld

**`befunde[]`**

| Feld | Pflicht | Werte |
|---|---|---|
| `id` | ja | Stabile Kennung, pro Kurs eindeutig. **Wichtig:** Derselbe Fund muss beim nächsten Lauf dieselbe `id` haben — daran erkennt der Pool-Manager, dass es kein neuer Fund ist. |
| `befund` | ja | Ein Satz: was fehlt oder nicht trägt, gern mit kurzem Zitat. |
| `vorschlag` | nein | Ein Satz: was konkret zu tun ist. |
| `schwere` | nein | `blockiert` \| `stoert` \| `hinweis`. Fehlt sie → `hinweis`. |
| `kategorie` | nein | `1`–`6` (siehe unten). Fehlt oder unbekannt → `7` („ohne Kategorie"). |
| `stelle.ziel_typ` | nein | `aktivitaet` \| `master_aufgabe` \| `allgemeine_aufgabe` \| `systembaustein` \| `lernpaket`. Fehlt → `lernpaket`. |
| `stelle.ziel_id` | nein, **sehr erwünscht** | Die ID bzw. `ref_id` aus dem Payload. Damit verlinkt die Taskliste direkt an die Stelle. |
| `stelle.ref_titel` | nein | Titel der Stelle (Fallback, wenn keine ID vorliegt). |
| `stelle.lernpaket_titel` | nein | Für die Gruppierung in der Taskliste. |
| `stelle.themenfeld_titel` | nein | Nur zur Orientierung. |

**Kategorien** (identisch zum MBK-Papier vom 2026-09-02):

1. Leer oder Platzhalter
2. Arbeitsauftrag unklar oder nicht bearbeitbar
3. Erwartungshorizont fehlt oder trägt nicht
4. Rückmeldeweg nicht entschieden
5. Material und Text nicht schülertauglich
6. Keinem Themenfeld zugeordnet
7. *(nur Pool-Manager)* Von der MBK gemeldet, ohne Kategorie

**`externe_punkte[]`**

| Feld | Pflicht | Werte |
|---|---|---|
| `id` | ja | Stabile Kennung, pro Kurs eindeutig. |
| `titel` | ja | Kurzbezeichnung, z. B. „Moodle-Abgaben anlegen". |
| `beschreibung` | nein | Was genau zu tun ist. |
| `art` | nein | `moodle` \| `ki_prompt` \| `sonstiges`. Fehlt → `sonstiges`. |
| `anzahl` | nein | Stückzahl, falls sinnvoll. |

## Was der Pool-Manager damit macht

1. **Abholen** — einmal täglich im Hintergrund für alle bereits exportierten
   Kurse, zusätzlich jederzeit per Knopf („Rückmeldung abholen") im Reiter 8.
2. **Übernehmen** — jeder Befund wird zu einem Eintrag in der Taskliste. Über
   die `id` erkannt: bekannte Funde werden aktualisiert, nicht verdoppelt.
3. **Dubletten prüfen** — auf Knopfdruck vergleicht der Pool-Manager die
   MBK-Funde mit seinen eigenen und markiert, was doppelt ist. Bewusst manuell:
   so verschwindet kein echter Fund automatisch.
4. **Abarbeiten** — die Lehrkraft setzt „behoben" oder — mit Begründung —
   „bewusst so gelassen". Begründungen reisen im nächsten Payload mit, damit
   der Bau denselben Punkt nicht erneut meldet.

## Zwei Bitten an die MBK

* **Stabile `id`s.** Sie sind der einzige Weg, denselben Fund über mehrere
  Läufe wiederzuerkennen. Wechselnde IDs erzeugen bei jedem Lauf neue Einträge.
* **`ziel_id` mitgeben, wo möglich.** Mit ID verlinkt die Taskliste direkt an
  die Stelle; ohne ID muss die Lehrkraft sie selbst suchen.

Alles andere ist optional — fehlende Felder führen nie zu einem Abbruch,
sondern zu einem konservativen Standardwert.