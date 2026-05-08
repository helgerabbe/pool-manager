# MBK-Air-Gap-Übergabe · Auslieferungs-Spezifikation

**Ticket:** Folge-Spezifikation zu `docs/mbk-integration.md`
**Status:** Schema-Entwurf zur gemeinsamen Abnahme
**Stand:** 2026-05-08
**Schema-Version:** 1.0.0
**Geltungsbereich:** Wie die vier MBK-Payloads aus dem Pool-Manager **physisch
an den MBK-Operator übergeben** werden.

> Dieses Dokument ergänzt `docs/mbk-integration.md`. Die Inhalts-Spezifikation
> (was in jedem Payload steht) ist dort geregelt. Hier wird nur das **Wie der
> Auslieferung** definiert — Format, UI-Reihenfolge, Persistenz, Hash-Anzeige.

---

## 0. Architektur-Vertrag: „Air Gap"

> 🔒 **Es gibt keine direkte technische Verbindung Pool-Manager → MBK.**
>
> Jede Payload-Übergabe erfolgt **Mensch-vermittelt**:
> - **Copy/Paste** in eine MBK-Eingabeoberfläche, **oder**
> - **Datei-Download** und manuelle Übergabe (E-Mail, Drive, …) an den
>   MBK-Operator.
>
> Der Mensch ist explizit als **Kontrollinstanz** Bestandteil der Architektur.
> Diese Trennung ist **Designentscheidung, kein Provisorium.**

**Konsequenzen für die Implementierung:**

1. **Niemals** ein HTTP-Request zur MBK aus dem Pool-Manager.
2. **Jede** generierte Payload muss in ≤2 Klicks beim Menschen landen
   (Clipboard oder Datei).
3. **Reihenfolge & Vollständigkeit** müssen visuell offensichtlich sein —
   der Operator sieht auf einen Blick, was als nächstes übergeben werden muss.
4. **Status der Übergabe** (was hat der Operator schon rüberkopiert?) wird
   rein **client-seitig** gespiegelt (`localStorage`). Kein Backend-State,
   keine Wahrheits-Quelle dafür im Backend nötig.

---

## 1. Die vier Payloads — Auslieferungs-Übersicht

| # | Payload-Typ | Inhalts-Spec | Anzahl pro Einheit | UI-Block |
|---|---|---|---|---|
| **1️⃣** | `system_context` | `mbk-integration.md` §3 (C-Global) | 1× pro Schule (cachebar via Hash) | Top-Block, prominent |
| **2️⃣** | `structure_payload` | `mbk-integration.md` §5 (Schema A) | 1× pro Einheit | Block 2 |
| **3️⃣** | `task_content_payload` | `mbk-integration.md` §5 (Schema B) | n× — pro Lernpaket + pro AllgemeineAufgabe E2/E3 | Block 3 (gruppiert) |
| **4️⃣** | `micro_payload` | `mbk-integration.md` §4 (C-Local) | n× — pro KI-aktivierter Aktivität / Aufgabe | Block 4 (gruppiert) |

### 1.1 Übergabe-Reihenfolge (empfohlen, nicht erzwungen)

```
1️⃣ → 2️⃣ → 3️⃣ → 4️⃣
```

Der Operator wird visuell geführt (Reihenfolge-Nummern, farbliche
Priorisierung), aber **nicht hart gesperrt**. Ein Tippfehler in einer
Aufgabe darf direkt zu Payload 4 führen, ohne 1–3 erneut anzufassen.

---

## 2. Format-Vertrag

### 2.1 Datei-Download

**Reines JSON.** Keine Wrapper, keine Kommentare, keine Markdown-Fences.

Ein Download liefert genau eine `.json`-Datei pro Payload-Typ:

```
mbk-payload-1-system-context_<einheit-slug>_<hashShort>.json
mbk-payload-2-structure_<einheit-slug>.json
mbk-payload-3-tasks_<einheit-slug>.json          (Bundle: alle Task-Payloads)
mbk-payload-4-micros_<einheit-slug>.json         (Bundle: alle Micro-Payloads)
```

Zusätzlich ein **„Alle 4 als ZIP"**-Sammel-Download:

```
mbk-payloads_<einheit-slug>_<timestamp>.zip
└── 1-system-context.json
└── 2-structure.json
└── 3-tasks.json
└── 4-micros.json
└── README.txt        (Reihenfolge + Hash-Info für den Operator)
```

### 2.2 Clipboard (Copy-Button)

Der Clipboard-Inhalt ist **Markdown mit JSON-Codefence** — sicher für
Chat-UIs, die JSON sonst als Fließtext rendern würden:

```
```json
{
  "meta": { ... },
  ...
}
```
```

Der **JSON-Body innerhalb der Fences ist byte-identisch** zur Datei-Variante.
Damit kann der Operator beide Wege mischen, ohne dass die MBK Unterschiede
sieht.

### 2.3 Bundle-Strategie für Payloads 3 + 4

Payloads 3 und 4 treten in n-facher Ausfertigung auf (n = Anzahl Lernpakete /
KI-Aktivitäten). Auslieferung:

- **Pro Item:** eigener Copy-Button + eigene Vorschau in der UI.
- **Sammelweg:** ein einziger JSON-Bundle pro Typ als Top-Level-Array:

```jsonc
// mbk-payload-3-tasks.json
{
  "meta": {
    "schema_version": "1.0.0",
    "einheit_id": "einheit:<uuid>",
    "exported_at": "2026-05-08T14:30:00.000Z",
    "system_context_hash": "a7f3...",
    "item_count": 12
  },
  "items": [
    { /* task_content_payload für Lernpaket 1 */ },
    { /* task_content_payload für Lernpaket 2 */ },
    ...
    { /* task_content_payload für AllgemeineAufgabe (E2) */ }
  ]
}
```

```jsonc
// mbk-payload-4-micros.json
{
  "meta": { ..., "item_count": 5 },
  "items": [
    { /* micro_payload für Aktivität A */ },
    { /* micro_payload für Aktivität B */ },
    ...
  ]
}
```

Damit hat der Operator die Wahl: einzeln pasten (für gezieltes Nachreichen)
oder als Bundle (für Erst-Übergabe). Die MBK akzeptiert beide Formen, weil
ein einzelnes Item byte-identisch zu einem Bundle-Item-Eintrag ist.

---

## 3. `system_context_hash` — Berechnung & Anzeige

### 3.1 Berechnung (Frontend)

Wir nutzen die **bestehende, deterministische Funktion**
`computeSystemContextHash` aus `lib/systemContextHash.js`:

```js
import { computeSystemContextHash } from '@/lib/systemContextHash';

const hash = computeSystemContextHash({
  stammdaten,            // useSchulStammdaten()
  schulNomenklatur,      // base44.entities.SchulNomenklatur.list()
  globalPrompts,         // base44.entities.MBKGlobalPrompt.list()
});
// → "a7f3c8e1b9d24f56" (16 Hex-Zeichen, FNV-1a-64)
```

**Rein client-seitig.** Kein Roundtrip. Der Hash ist **kein Sicherheitstoken**,
sondern ein Cache-Hinweis für den MBK-Operator („Hash unverändert →
Payload 1 nicht erneut übergeben nötig").

### 3.2 Anzeige in der UI

Im Block 1️⃣ wird der aktuelle Hash prominent gezeigt:

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣  System-Kontext                    Hash:  a7f3c8e1b9d24f56 │
│  ─────────────────────────────────────────────────────────  │
│  Globale Regelwerke (Mission, Lerntypen, Nomenklatur)        │
│                                                              │
│  [ ] Bereits an MBK übergeben                                │
│                                                              │
│  [ 📋 Kopieren ]  [ 💾 system-context.json ]                │
│                                                              │
│  ▸ Vorschau (1.234 Zeichen)                                 │
└─────────────────────────────────────────────────────────────┘
```

Wechselt der Hash (z. B. weil ein Admin im Manager-Tab eine Convention
geändert hat), wird die „Bereits übergeben"-Markierung **automatisch
ungültig** und der Block bekommt einen 🟡-Out-of-Sync-Indikator.

### 3.3 Hash in Payloads 2–4

Jeder ausgelieferte Payload (2, 3, 4) trägt im `meta`-Block den **aktuell
gültigen** `system_context_hash`. Damit kann der Operator (und auch die
MBK selbst) prüfen, ob die Payloads zueinander passen:

```jsonc
"meta": {
  "schema_version": "1.0.0",
  "einheit_id": "einheit:<uuid>",
  "exported_at": "2026-05-08T14:30:00.000Z",
  "system_context_hash": "a7f3c8e1b9d24f56",
  ...
}
```

Hash-Mismatch zwischen Payload 1 und Payload 2/3/4 = Operator hat versehentlich
einen veralteten Payload übergeben → MBK schlägt Alarm.

---

## 4. Persistenz in `ExportPrompts`

### 4.1 Erweiterung des `prompt_type`-Enums

Die `ExportPrompts`-Entity wird um vier neue Werte ergänzt — die alten
Markdown-basierten Werte bleiben unverändert (Coexistenz):

| Wert | Bedeutung | Inhalt von `content` |
|---|---|---|
| **`mbk_system_context`** | Payload 1 | JSON-String (stringified) |
| **`mbk_structure_payload`** | Payload 2 | JSON-String |
| **`mbk_task_content_payload`** | Payload 3 (pro Item — `reference_id` = Lernpaket-/Aufgabe-ID) | JSON-String |
| **`mbk_micro_payload`** | Payload 4 (pro Item — `reference_id` = Aktivitäts-/Aufgabe-ID) | JSON-String |
| `nucleus`, `persona`, `sektor_struktur`, `sektor_anweisung`, `erstellungspaket` | **Legacy/Markdown** — bleiben für altes Copy-Paste-UI bestehen | Markdown |

`reference_id` für die JSON-Payloads:

- `mbk_system_context` → `null` (1× pro Einheit)
- `mbk_structure_payload` → `null` (1× pro Einheit)
- `mbk_task_content_payload` → ID des Lernpakets bzw. der AllgemeineAufgabe
- `mbk_micro_payload` → ID der Aktivität bzw. AllgemeineAufgabe (Ebene 2/3)

### 4.2 Out-of-Sync-Logik (unverändert)

Die bestehende Logik aus `lib/exportPromptSync.js` (`source_updated_at` +
`template_version`) gilt 1:1 weiter. Pro Payload-Typ wird der relevante
Quell-Timestamp-Index erweitert:

| Payload-Typ | Quellen für `source_updated_at` |
|---|---|
| `mbk_system_context` | `Schul-Stammdaten`, `SchulNomenklatur`, alle aktiven `MBKGlobalPrompt` |
| `mbk_structure_payload` | `Einheit`, alle `Themenfeld`, alle `Lernpakete`, `lernpfade_konfiguration`, alle `LernpaketPhaseAktivitaet`, alle `AllgemeineAufgabe` der Einheit |
| `mbk_task_content_payload` | je Item: das Lernpaket bzw. die AllgemeineAufgabe + zugehörige `Lernziele`, `LernpaketPhaseAktivitaet`, `MasterAufgabe`, `Aufgabenbausteine` |
| `mbk_micro_payload` | je Item: die Aktivität bzw. AllgemeineAufgabe + ihr `ki_briefing`, `transkript`, zugehöriges Lernpaket (für GPS) |

`template_version` bekommt einen neuen Konstanten-Bereich `MBK_AIRGAP_VERSION`
in `lib/exportPromptTemplates.js` (z. B. `'airgap-1.0.0'`), damit ein
Schema-Update der JSON-Payloads alle gespeicherten Air-Gap-Prompts als
veraltet markiert — analog zur existierenden `MBK_TEMPLATE_VERSION` für die
Markdown-Welt.

### 4.3 Warum überhaupt persistieren?

- **Out-of-Sync-Indikator** für den Operator (was muss erneut rüber?).
- **Audit-Trail** über `created_by` + `updated_date`: Wer hat den Payload
  zuletzt regeneriert?
- **Performance**: Nicht jeder Tab-Wechsel zwingt zum Neuberechnen aller n
  Task-/Micro-Payloads.
- **Bulk-Generierung**: Der bestehende `useMBKBulkGenerate`-Plan kann die
  Air-Gap-Payloads gleich miterzeugen.

---

## 5. UI-Verhalten im `MBKPromptGeneratorPanel`

### 5.1 Neue Akkordeon-Struktur (parallel zur Markdown-Welt)

Das Panel bekommt einen **neuen Tab oder Switch** zwischen zwei Modi:

- **Modus „Markdown" (Legacy):** Heutige Akkordeon-Sektionen — bleibt für
  Operatoren, die noch in Chat-UIs arbeiten.
- **Modus „Air-Gap-Payloads" (neu):** Vier-Block-Layout dieses Dokuments.

Im Air-Gap-Modus:

```
┌──── MBK-Übergabe-Checkliste ────┐
│ [ ] 1️⃣ System-Kontext (a7f3…)    │
│ [ ] 2️⃣ Struktur                  │
│ [ ] 3️⃣ Aufgaben (12)             │
│ [ ] 4️⃣ Micros (5)                │
│                                 │
│ 0 / 4 übergeben                 │
│ [ Reset Checkliste ]            │
└─────────────────────────────────┘

▼ 1️⃣ System-Kontext              [📋 Kopieren] [💾 Datei] [🟡 Out-of-sync]
   Hash: a7f3c8e1b9d24f56         [ ] Übergeben
   ▸ Vorschau (1.234 Zeichen)

▼ 2️⃣ Struktur der Einheit         [📋] [💾]
   ▸ Vorschau

▼ 3️⃣ Aufgabeninhalte (12)         [💾 Bundle.json] [💾 ZIP]
   ▾ Lernpaket 1: …               [📋] [💾]   [ ] Übergeben
   ▾ Lernpaket 2: …               [📋] [💾]
   ▾ Aufgabe E2: …                [📋] [💾]   🟡

▼ 4️⃣ Micro-Briefings (5)          [💾 Bundle.json]
   ▾ Aktivität: Miniquiz Steigung [📋] [💾]
   ...
```

### 5.2 Visuelle Führung der Reihenfolge

- Solange Block 1️⃣ nicht abgehakt ist: Blöcke 2–4 werden mit reduzierter
  Button-Prominenz gerendert (Outline statt Solid-Buttons).
- Sobald 1️⃣ abgehakt ist: 2️⃣ wird visuell „aktiv".
- **Niemals** Buttons disablen — der Operator muss jederzeit jeden Payload
  abrufen können (Tippfehler-Korrektur-Workflow).

### 5.3 „Übergeben"-Checkboxen

- **Speicherort:** `localStorage`, Key:
  `mbk-airgap-handover:<einheit-id>:<payload-key>`.
- **Werte:** `{ checked: true, hash_at_check: 'a7f3...', checked_at: ISO }`.
- **Auto-Invalidierung:** Wenn der aktuelle `system_context_hash` vom
  gespeicherten `hash_at_check` abweicht, wird die Checkbox automatisch
  zurückgesetzt und ein Hinweis angezeigt:
  > „System-Kontext hat sich geändert — bitte erneut übergeben."

### 5.4 Bulk-Aktionen

- **„Alle 4 als ZIP herunterladen"** — sammelt alle aktuellen Payloads in
  ein ZIP. Erfordert keine Persistierung, ist on-the-fly.
- **„Alle out-of-sync Payloads regenerieren"** — bestehender
  `useMBKBulkGenerate`-Flow, erweitert um die vier neuen Payload-Typen.

---

## 6. Datei-Naming-Konvention

| Element | Format | Beispiel |
|---|---|---|
| Einheit-Slug | kebab-case, ASCII-only, ≤40 Zeichen | `mathe-9-lineare-funktionen` |
| Hash-Short | erste 8 Zeichen des `system_context_hash` | `a7f3c8e1` |
| Timestamp | `YYYY-MM-DD-HHmm` (lokale Zeit, Europe/Berlin) | `2026-05-08-1430` |

```
mbk-payload-1-system-context_a7f3c8e1.json
mbk-payload-2-structure_mathe-9-lineare-funktionen.json
mbk-payload-3-tasks_mathe-9-lineare-funktionen.json
mbk-payload-4-micros_mathe-9-lineare-funktionen.json
mbk-payloads_mathe-9-lineare-funktionen_2026-05-08-1430.zip
```

---

## 7. Was sich am Backend ändert

**Minimal:** Es gibt keine neuen REST-Endpoints zur MBK. Bestehende
Generator-Funktionen (`buildNucleusPrompt` etc.) werden **erweitert**, um
zusätzlich JSON-Objekte zurückzugeben — die String-Pendants bleiben
unangetastet.

Voraussichtliche neue Bausteine (werden in Folge-Tickets gebaut):

- `lib/mbkAirGapPayloads.js` — pure Builder-Funktionen pro Payload-Typ
  (analog zu `lib/exportPromptTemplates.js`, aber mit JSON-Output).
- `lib/__tests__/mbkAirGapPayloads.test.js` — Snapshot-Tests pro Payload.
- Erweiterung von `entities/ExportPrompts.json` um die vier neuen
  Enum-Werte in `prompt_type`.
- Erweiterung von `lib/exportPromptSync.js` (Quell-Timestamp-Index
  pro neuem Payload-Typ).
- Neuer UI-Modus im `MBKPromptGeneratorPanel` (separate Komponente,
  z. B. `components/export/MBKAirGapPanel.jsx`).

**Keine** neuen Functions, **keine** neuen Connectors, **keine** neuen
Secrets. Alles client-seitig + DB-seitig.

---

## 8. Abgrenzung zu `mbk-integration.md`

| Frage | Antwort dort | Antwort hier |
|---|---|---|
| Welche Felder enthält C-Global? | §3 | — |
| Welche Felder enthält C-Local? | §4 | — |
| Wie wird C-Global an die MBK übertragen? | (offen gelassen) | **§2: Copy/Paste oder Datei-Download. Kein API-Call.** |
| Wann gilt ein Payload als „übergeben"? | (offen gelassen) | **§5.3: Manueller Haken durch den Operator.** |
| Wie wird Cache invalidiert? | §2.3 (Hash-Vergleich auf MBK-Seite) | **§3: Hash wird im Pool-Manager-UI angezeigt; Operator entscheidet.** |
| Wer berechnet den Hash? | (offen gelassen) | **§3.1: Frontend, via `computeSystemContextHash`.** |

---

## 9. Abnahme

| Rolle | Name | Datum | Status |
|---|---|---|---|
| App-Team | App-Team-Lead |  | ☐ |
| MBK-Entwicklung | MBK-Entwicklungsleitung |  | ☐ |
| Planungs-/Didaktik-Lead | _(zu ergänzen)_ |  | ☐ |

> Sobald freigegeben, beginnt die Implementierung in folgender Reihenfolge:
> (1) `entities/ExportPrompts.json` erweitern · (2) `lib/mbkAirGapPayloads.js`
> + Tests · (3) `MBKAirGapPanel.jsx` als parallele UI · (4) Operator-Doku
> für den Tagesbetrieb.

---

## 10. Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| 1.0.0 | 2026-05-08 | Initiale Spezifikation der Air-Gap-Auslieferung (4 Payloads, JSON+Markdown-Fence, Datei-Download, Hash-Anzeige, Persistenz in `ExportPrompts`, UI-Reihenfolge ohne Hard-Lock) |