# Rückmeldung der MBK an den Pool-Manager — Format

Stand: 2026-09-04 · gelesenes Format: **`rueckmeldung-1`** (so, wie der Bau es
bereits schreibt). Diese Datei beschreibt, was der Pool-Manager auswertet.

## Warum das so läuft

Bisher kamen Rückmeldungen des Baus per E-Mail und mussten von Hand an die
zuständigen Lehrkräfte weitergeleitet werden. Der Pool-Manager hat mit dem
Prüfbereich (Reiter 8) längst eine Taskliste, in der genau solche Punkte
abgearbeitet werden. Statt der E-Mail legt die MBK ihre Funde als Datei im
Repository ab; der Pool-Manager holt sie ab und legt sie in dieselbe Taskliste —
in einen eigenen Reiter „Rückmeldung der MBK".

**Wichtig:** Die MBK musste dafür nichts umstellen. Der Pool-Manager liest das
Format, das der Bau schon erzeugt.

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
  "format": "rueckmeldung-1",
  "kurs": "englisch-9-exploring-australia",
  "einheit_id": "69e8b0cc3a03a6fed7cb15fd",
  "einheit": "Exploring Australia",
  "export_vom": "2026-09-02T20:46:36.328Z",
  "gebaut_am": "2026-09-04T06:31:51.273Z",

  "befunde": [
    {
      "id": "b-cf75f7",
      "aktivitaet_id": "69e8e1399fc8dcfd2431a4af",
      "aktivitaet": "Language and Communication",
      "themenfeld_id": "69e8e1399fc8dcfd2431a4af",
      "themenfeld": "TF2 Language and Communication",
      "kategorie": 1,
      "schwere": "blockiert",
      "befund": "Aktivität ohne Inhalt; im Kurs stünde ein Entwurf.",
      "vorschlag": "Im Pool-Manager füllen oder löschen.",
      "status": "offen",
      "bewusst_exportiert": false
    }
  ],

  "checkliste_extern": [
    {
      "text": "Moodle-Abgabe anlegen für „Job Interview Simulation" und URL eintragen.",
      "aktivitaet_id": "6a84207d7945a8a4204ab19f"
    }
  ],

  "brian_auftraege": [ … ]
}
```

## Die drei Listen werden bewusst unterschiedlich behandelt

| Liste | Bedeutung | Landet im Pool-Manager |
|---|---|---|
| `befunde` | Etwas an einer **Stelle der Einheit** trägt nicht. Eine Lehrkraft kann es beheben. | Taskliste Reiter 8 → „Rückmeldung der MBK" |
| `checkliste_extern` | Etwas muss **außerhalb** des Pool-Managers getan werden (Moodle-Abgaben, Prompts, Technik). | Karte „Offene MBK-Aktionen" für die Administration |
| `brian_auftraege` | Übertragungsstand der KI-Tutor-Dialoge. | **Nichts** — dafür gibt es im Prüfbereich schon den eigenen Brian-Check. |

Die Trennung ist der Kern: Externe Punkte in der Lehrkraft-Taskliste würden sie
aufblähen, ohne dass die Lehrkraft sie erledigen könnte.

### `befunde[]` — Feld für Feld

| Feld | Pflicht | Werte |
|---|---|---|
| `id` | ja | Stabile Kennung, pro Kurs eindeutig. **Wichtig:** Derselbe Fund muss beim nächsten Lauf dieselbe `id` haben — daran erkennt der Pool-Manager, dass es kein neuer Fund ist. |
| `befund` | ja | Ein Satz: was fehlt oder nicht trägt, gern mit kurzem Zitat. Fehlt er, wird der Punkt übersprungen. |
| `vorschlag` | nein | Ein Satz: was konkret zu tun ist. |
| `schwere` | nein | `blockiert` \| `stört` (auch `stoert`) \| `hinweis`. Fehlt oder unbekannt → `hinweis`. |
| `kategorie` | nein | `1`–`6` (siehe unten). Fehlt oder unbekannt → `7` („ohne Kategorie"). |
| `aktivitaet_id` | nein, **sehr erwünscht** | ID der Stelle aus dem Payload. Der Pool-Manager erkennt selbst, ob es eine Aktivität, ein Lernpaket, eine allgemeine Aufgabe oder ein Themenfeld ist, und verlinkt entsprechend. |
| `aktivitaet` | nein | Titel der Stelle — wird als Anzeigetitel der Aufgabe genutzt. |
| `themenfeld_id`, `themenfeld` | nein | Für die Gruppierung in der Taskliste. |
| `bewusst_exportiert` | nein | `true` = der Bau kennt unsere Begründung. Der Punkt wird dann **nicht** in die Taskliste übernommen. |
| `status` | nein | `erledigt` wird übersprungen; alles andere gilt als offen. |

Ein verschachteltes `stelle`-Objekt (`stelle.ziel_id`, `stelle.ref_titel`, …)
wird ebenfalls gelesen, falls der Bau später darauf umstellt.

**Kategorien** (identisch zum MBK-Papier vom 2026-09-02):

1. Leer oder Platzhalter
2. Arbeitsauftrag unklar oder nicht bearbeitbar
3. Erwartungshorizont fehlt oder trägt nicht
4. Rückmeldeweg nicht entschieden
5. Material und Text nicht schülertauglich
6. Keinem Themenfeld zugeordnet
7. *(nur Pool-Manager)* Von der MBK gemeldet, ohne Kategorie

### `checkliste_extern[]`

| Feld | Pflicht | Werte |
|---|---|---|
| `text` | ja | Was zu tun ist. Wird Titel und Beschreibung des Admin-Punktes. |
| `aktivitaet_id` | nein | Bezug zur Stelle — geht in die stabile Kennung ein. |
| `id`, `art`, `anzahl` | nein | Falls vorhanden, werden sie genutzt. Ohne `id` bildet der Pool-Manager eine stabile Kennung aus Stelle + Text; die `art` (`moodle` \| `ki_prompt` \| `sonstiges`) erkennt er am Text. |

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

## Die einzige Bitte an die MBK

**Stabile `id`s.** Sie sind der einzige Weg, denselben Fund über mehrere Läufe
wiederzuerkennen. Wechselnde IDs erzeugen bei jedem Lauf neue Einträge.

Alles andere ist optional — fehlende Felder führen nie zu einem Abbruch,
sondern zu einem konservativen Standardwert.