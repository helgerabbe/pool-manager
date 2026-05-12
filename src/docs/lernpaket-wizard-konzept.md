# Lernpaket-Wizard · Konzeptpapier

**Status:** Entwurf v0.2 (nach Review der Planungsabteilung)
**Stand:** 2026-05-12
**Geltungsbereich:** Neue „Wizard"-basierte Arbeitsweise in den Tabs 3
(Lernpakete), 5 (Allgemeine Aufgaben) und 6 (Projekte) — als didaktisch
geführte Alternative zum reinen manuellen Abarbeiten.

> Dieses Dokument ist ein **reines Konzeptpapier**. Es enthält keinen Code
> und schreibt keine Entscheidung fest. Ziel ist, vor jeder Implementierung
> eine gemeinsame Verständigung über Scope, Datenmodell, UI und KI-Vertrag
> zu erreichen.

---

## 1. Vision & Problemstellung

### 1.1 Beobachtung aus der Praxis

Die Werkbank (`pages/Workspace`) ist sehr mächtig: in Tab 1 (Struktur) und
Tab 2 (Lernpfad-Architekt) erlebt die Lehrkraft einen **kreativen Flow** —
man verschiebt Themenfelder, ordnet Lernpakete zu, sieht sofort, was
entsteht. Sobald man jedoch in **Tab 3 (Aktivitäten)** ankommt, kippt die
Stimmung: pro Lernpaket muss für drei Phasen (Input/Übung/Abschluss) jede
einzelne Aktivität von Hand angelegt werden, dann jedes Feld konfiguriert.
Dieselbe Erfahrung wiederholt sich in Tab 5 (Allgemeine Aufgaben) und Tab 6
(Projekte). Die Aufgabe wird vom kreativen Akt zum **Abarbeiten**.

### 1.2 Zielbild

Wir verlängern die kreative Linie aus Tab 1 + Tab 2 nach hinten: Lehrkraft
**beschreibt** in eigenen Worten, was sie sich für ein Lernpaket / ein
Themenfeld / eine Einheit vorstellt — eine KI entwirft daraus einen
**konkreten Bauplan**: welche Aktivitäten in welcher Phase, welche
Allgemeinen Aufgaben mit welcher Mission, welche Projekte. Die Lehrkraft
übernimmt oder verwirft. Die eigentliche **inhaltliche Ausarbeitung**
(Lückentext-Wörter, Quiz-Fragen etc.) bleibt davon **unberührt** — sie
erfolgt nach wie vor entweder manuell oder über die schon existierenden
KI-Briefing-Mechanismen pro Aktivität.

### 1.3 Was die Wizards explizit NICHT tun

- Sie generieren **keine fertigen Aufgabeninhalte** (keine Lückentexte,
  keine Quiz-Fragen). Sie legen **leere Hüllen** mit Typ und ki_briefing-
  Stub an.
- Sie ändern **nicht die Themenfeld-/Lernpaket-Struktur**. Themenfelder und
  Lernpakete legt die Lehrkraft weiterhin in Tab 1 an.
- Sie ersetzen **nicht** die bestehenden manuellen Workflows in Tab 3/5/6 —
  sie sind eine optionale, zusätzliche Einstiegstür.

---

## 2. Die drei Wizards im Überblick

| Wizard | Ebene des Triggers | Beschreibung gespeichert an | KI-Output | Konfliktverhalten |
|---|---|---|---|---|
| **Tab 3 — Lernpaket-Wizard** | pro Lernpaket | `Lernpakete.kreativ_briefing` | Aktivitäten (leere Hüllen) in Phasen Input/Übung/Abschluss, mit Typ aus `AktivitaetenKatalog` | Rückfrage am Ende: **Ersetzen** oder **Additiv hinzufügen** (mit Anzeige des aktuellen Inhalts) |
| **Tab 5 — Themenfeld-Wizard** | pro Themenfeld | `Themenfeld.kreativ_briefing` | Allgemeine Aufgaben mit `mission_type` + grobem Sinngehalt | **Immer additiv**, keine Rückfrage |
| **Tab 6 — Projekt-Wizard** | pro Einheit | `Einheiten.projekt_kreativ_briefing` | Projekt-Anker / Ebene-3-Aufgaben | **Immer additiv**, keine Rückfrage |

**Gemeinsame Mechaniken aller drei Wizards:**

- Modaler Fullscreen-Wizard (Pattern wie `WizardStepAssistenz`)
- Sandbox-Textfeld (großer Freitext) + Glossar-Sidebar mit klickbaren
  Fachbegriff-Chips (Quelle pro Wizard verschieden, s. §6)
- Statische Mini-Anleitung („Was macht eine gute Beschreibung aus?")
- KI-Vorschau als **Strukturbaum** mit „Übernehmen"-Button
- Persistierung der Lehrkraft-Beschreibung in der DB, dauerhaft
- Architektur: ein gemeinsames `LernpaketWizardModal`-Pattern, dreimal
  parametriert verwendet (s. §8)

---

## 3. MVP-Scope: Tab 3 zuerst

Wir bauen den **Lernpaket-Wizard (Tab 3)** als ersten von drei Wizards.

**Begründung:**

1. Tab 3 ist der schmerzhafteste Punkt im aktuellen Workflow (am stärksten
   „abarbeitend" empfunden).
2. Die kleinste Granularität (ein Lernpaket) ist leicht zu fassen, leicht zu
   testen und macht den Nutzen sofort sichtbar.
3. Wir lernen das Pattern und können die Tabs 5 + 6 in späteren Iterationen
   mit minimalem Mehraufwand nachziehen — die wiederverwendbaren Komponenten
   stehen dann schon (s. §8).

Tab 5 und Tab 6 werden in diesem Dokument **strukturell skizziert** (§7),
aber **nicht detailliert spezifiziert**. Das holen wir nach, sobald der
MVP-Lernpaket-Wizard live ist und Praxiserfahrung vorliegt.

---

## 4. Detail-Spezifikation: Tab-3-Lernpaket-Wizard

### 4.1 User-Flow (Schritt für Schritt)

#### Schritt 0 — Einstieg in Tab 3

Lehrkraft ist in Tab 3, sieht die linke Sidebar mit Themenfeldern und
Lernpaketen. Sie klickt ein Lernpaket an. Rechts erscheint wie bisher der
Editor — **neu:** prominent positioniert ein Button **„🪄 Lernpaket mit
KI-Assistent füllen"**.

Sichtbarkeit des Buttons:

- Immer sichtbar, solange die Einheit editierbar ist (`freigabe_status =
  Freigegeben für Bearbeitung`, Lifecycle ≠ `export_running` /
  `published`).
- Bei gelocktem Lernpaket: Button deaktiviert, Tooltip „Aktuell von … in
  Bearbeitung".
- Hat das Lernpaket schon ein `kreativ_briefing`: Button-Label bleibt
  gleich, daneben kleines Badge „Briefing vom *Datum*" (klickbar → öffnet
  Wizard im Re-Edit-Modus, s. §4.6).

#### Schritt 1 — Wizard öffnet sich (Fullscreen-Modal)

Layout (textuelle Mockup-Beschreibung):

```
┌──────────────────────────────────────────────────────────────────────┐
│ Lernpaket-Assistent  ·  Einheit: …  ·  Themenfeld: …  ·  Lernpaket: │ ← Breadcrumb-Header
│                                                                  [X] │
├──────────────────────────────────────────────────────────────────────┤
│                                                  │                   │
│  Was sollen die Schülerinnen und Schüler in     │  Glossar          │
│  diesem Lernpaket lernen und tun?               │  ───────────────  │
│                                                  │                   │
│  ┌────────────────────────────────────────────┐ │  Phasen:          │
│  │                                            │ │  [Input]          │
│  │  (Sandbox-Textarea, ~12 Zeilen,            │ │  [Übung]          │
│  │   autoresize)                              │ │  [Abschluss]      │
│  │                                            │ │                   │
│  │  Platzhalter: „Beschreibe in eigenen       │ │  Aktivitätstypen: │
│  │   Worten, was hier passieren soll. Die KI  │ │  [Video]          │
│  │   schlägt dir dann eine Aktivitäts-        │ │  [Lückentext]     │
│  │   struktur vor."                           │ │  [Sortieraufgabe] │
│  │                                            │ │  [Miniquiz]       │
│  └────────────────────────────────────────────┘ │  [Zuordnung]      │
│                                                  │  [Bild]           │
│  ℹ️  So gelingt eine gute Beschreibung           │  …                │
│  ▸ Klicke einen Begriff an, um ihn einzufügen   │                   │
│  ▸ Erwähne Phasen wie „Input" oder „Übung",     │  (alle aus DB     │
│    wenn du sie konkret zuordnen möchtest        │   AktivitaetenKa  │
│  ▸ Nenne Aktivitätstypen, wenn du dir schon     │   talog,          │
│    sicher bist                                   │   gefiltert auf   │
│  ▸ Du musst keine perfekten Sätze schreiben     │   ist_active)     │
│                                                  │                   │
├──────────────────────────────────────────────────────────────────────┤
│ [Abbrechen]                          [KI-Vorschlag generieren →]    │
└──────────────────────────────────────────────────────────────────────┘
```

**Verhalten:**

- Glossar-Chips sind **klickbar** → fügen den Begriff an der aktuellen
  Cursor-Position ins Textfeld ein (mit Leerzeichen davor/danach).
- Beim Klick erscheint kurz ein dezenter Highlight-Effekt am eingefügten
  Begriff (visueller Bestätigungs-Microinteraction).
- Beim Re-Edit (Lernpaket hatte schon ein Briefing): Textfeld ist
  vorbefüllt mit `Lernpakete.kreativ_briefing`.
- „KI-Vorschlag generieren" ist deaktiviert, solange `kreativ_briefing`
  weniger als ~20 Zeichen hat (UI-Hinweis: „Bitte beschreibe etwas
  genauer.").

#### Schritt 2 — Generierungs-Phase

Klick auf „KI-Vorschlag generieren →" löst zwei Dinge aus:

1. **Persistenz:** Aktueller Textfeld-Inhalt wird sofort als
   `Lernpakete.kreativ_briefing` gespeichert (auch wenn die Generierung
   später scheitert — die Beschreibung geht nicht verloren).
2. **Backend-Call** `generateLernpaketAktivitaeten` (neuer Endpoint, s. §5)
   wird gestartet.

UI-Zustand während der Generierung:

- Sandbox-Bereich verkleinert sich (collapsible, Inhalt bleibt lesbar
  oben).
- Darunter Loading-Skelett mit Text „KI entwirft den Aktivitäts-Bauplan…".
- Glossar bleibt sichtbar (für Kontext).

#### Schritt 3 — Vorschlag-Vorschau

KI liefert eine strukturierte Antwort, die als Strukturbaum gerendert wird:

```
🪄 KI-Vorschlag für „Lernpaket: Steigungsdreieck"

  📥 Input
    ▸ Video „Was ist eine Steigung?" (Aktivitätstyp: Video anschauen)
      → Sollen die SuS einen ersten visuellen Eindruck bekommen.
    ▸ Bild eines Steigungsdreiecks (Aktivitätstyp: Bild betrachten)
      → Visuelle Anker setzen, Vorwissen aktivieren.

  ✏️ Übung
    ▸ Lückentext: Grundbegriffe (Aktivitätstyp: Lückentext)
      → Wortschatz sichern (Steigung, Gefälle, Δx, Δy).
    ▸ Sortieraufgabe: Steigungen ordnen (Aktivitätstyp: Sortieren)
      → Steigung als Maß für Veränderung greifbar machen.

  🎯 Abschluss
    ▸ Miniquiz „Steigung erkennen" (Aktivitätstyp: Miniquiz)
      → Lernkontrolle, Übergang zur nächsten Einheit vorbereiten.

  [ ⟲ Anders versuchen ]                     [ Diesen Vorschlag übernehmen → ]
```

**Verhalten:**

- Jedes Item ist **anklickbar** → klappt eine kleine Begründung der KI auf
  (kommt aus dem Response-Schema, Feld `begruendung`).
- „⟲ Anders versuchen" → zurück zur Sandbox, Briefing bleibt erhalten, KI
  wird nach optionalem Nachjustieren erneut aufgerufen.
- „Diesen Vorschlag übernehmen →" → Schritt 4.

#### Schritt 4 — Konflikt-Dialog (nur wenn nötig)

Wenn das Lernpaket bereits Aktivitäten enthält:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Wie sollen wir die KI-Aktivitäten übernehmen?                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Aktuell im Lernpaket:               KI-Vorschlag:                  │
│  ──────────────────────              ───────────────                │
│  📥 Input (1):                       📥 Input (2)                   │
│    • Video „Linearität"                                              │
│  ✏️ Übung (2):                       ✏️ Übung (2)                   │
│    • Lückentext „Begriffe"                                           │
│    • Quiz „Grundlagen"                                               │
│  🎯 Abschluss (0):                   🎯 Abschluss (1)               │
│                                                                      │
│  ○ Bestehende Aktivitäten BEHALTEN und Vorschlag ergänzend          │
│    hinzufügen (additiv)                                              │
│  ○ Bestehende Aktivitäten ERSETZEN durch den Vorschlag              │
│                                                                      │
│ [Zurück]                                       [Übernehmen]         │
└──────────────────────────────────────────────────────────────────────┘
```

**Bei leerem Lernpaket** (keine vorhandenen Aktivitäten): Dieser Dialog
wird übersprungen, Übernahme erfolgt direkt.

#### Schritt 5 — Übernahme & Schließen

- Backend-Call `applyLernpaketWizardProposal(lernpaket_id, modus, items)`
  legt die Aktivitäten an (s. §5.3).
- Toast: „✓ 5 Aktivitäten angelegt".
- Wizard schließt sich, Sidebar lädt das Lernpaket neu, die neuen
  Aktivitäten erscheinen in der Liste — jede mit Status `draft` und
  `erstellungs_modus: 'ki'` (das aktiviert die bestehende ki_briefing-
  Mechanik für die nächste Stufe der Ausarbeitung).

### 4.2 KI-Payload (Request an `generateLernpaketAktivitaeten`)

```jsonc
{
  "lernpaket_id": "lernpaket:<uuid>",

  "kontext": {
    "fach": "Mathematik",
    "jahrgangsstufe": "9",
    "titel_einheit": "Lineare Funktionen",
    "titel_themenfeld": "Steigung m",
    "titel_lernpaket": "Steigungsdreieck",
    "geschaetzte_dauer_minuten": 45,
    "kernbegriffe": ["Steigung", "Δx", "Δy"]   // aus Lernpakete.kernbegriffe, kann leer sein
  },

  "briefing": "<vollständiger Sandbox-Text der Lehrkraft>",

  "lernziele_im_lernpaket": [                  // hilft der KI bei der Schwerpunktsetzung
    "Die SuS können den Steigungswert m an einem Graphen ablesen.",
    "..."
  ],

  "verfuegbare_aktivitaetstypen": [            // 1:1 aus AktivitaetenKatalog (ist_active = true)
    {
      "name": "Video anschauen",
      "phase": "Input",
      "description": "SuS schauen ein kurzes Erklärvideo, um einen ersten visuellen Zugang zum Thema zu bekommen."
    },
    {
      "name": "Lückentext",
      "phase": "Übung",
      "description": "SuS füllen Lücken in einem vorgegebenen Text aus — geeignet für Wortschatz-/Begriffssicherung."
    },
    {
      "name": "Miniquiz",
      "phase": "Abschluss",
      "description": "Kurzer Multiple-Choice-Test mit max. 5 Fragen zur reinen Wissensabfrage."
    }
    // … weitere Typen, 1:1 aus AktivitaetenKatalog
  ],

  // Vier-Lerntypen-Kontext (Variante β, s. §4.7).
  // Wird der KI als reines Hintergrundwissen mitgegeben — die KI darf
  // KEINE lerntyp-spezifische Differenzierung in die Aktivitäts-Struktur
  // einbauen. Quelle: MBKGlobalPrompt(def_lerntypen) bzw. die vier
  // Einzel-Schlüssel pro Lerntyp.
  "lerntypen_kontext": [
    { "key": "minimalist",  "kurzbeschreibung": "fokussiert auf das Wesentliche, …" },
    { "key": "pragmatiker", "kurzbeschreibung": "…" },
    { "key": "ehrgeizig",   "kurzbeschreibung": "…" },
    { "key": "passioniert", "kurzbeschreibung": "…" }
  ],

  "constraints": {
    "min_aktivitaeten_pro_phase": 0,
    "max_aktivitaeten_pro_phase": 4,
    "max_gesamt": 8
  }
}
```

**Wichtige Hinweise:**

- **Aktivitätstyp-Beschreibungen (Punkt A der Review):** Jeder
  Aktivitätstyp wird mit einer **1-Satz-Definition** an die KI übergeben.
  Quelle ist dieselbe Konstante, die auch das Glossar-Tooltip (§6.3) speist
  — Single Source of Truth, damit Lehrkraft und KI das gleiche Verständnis
  haben.
- **System-Kontext der MBK (C-Global):** Wir packen ihn **nicht komplett**
  rein. Dieser Wizard arbeitet auf Pool-Manager-Ebene, nicht auf
  MBK-Generierungs-Ebene. Er nutzt einen eigenen, schlanken LLM-Call
  (analog zu `generateUnitStructure`).
- **Vier-Lerntypen-Kontext (Variante β, Punkt 3 der Review, s. §4.7):**
  Die **Kurzbeschreibungen aller vier Lerntypen** werden mitgegeben — als
  Hintergrund, nicht als Differenzierungsauftrag. Detail-Begründung in
  §4.7.

### 4.3 KI-Response-Schema

```jsonc
{
  "vorschlag": [
    {
      "phase": "Input",                                 // muss zur Phase des Aktivitätstyps passen
      "aktivitaetstyp_name": "Video anschauen",         // exakt aus verfuegbare_aktivitaetstypen
      "titel_vorschlag": "Was ist eine Steigung?",      // wird als Hinweis im Editor sichtbar, NICHT in der Aktivitäts-Entity gespeichert (Aktivitäten haben keinen Titel)
      "begruendung": "Erste visuelle Auseinandersetzung …",
      "ki_briefing_skizze": {                           // direkter Input für das spätere ki_briefing
        "variant": "standard",
        "schwerpunkt": "Konzept der Steigung visuell einführen"
      }
    },
    // …
  ]
}
```

**Validierung im Backend (überarbeitet nach Review-Punkt B):**

- `phase ∈ {Input, Übung, Abschluss}` — bei Verstoß: Item verwerfen.
- `aktivitaetstyp_name` muss in `verfuegbare_aktivitaetstypen` existieren
  — bei Verstoß: Item verwerfen.
- **Phase-Mismatch (Aktivitätstyp existiert, aber für eine andere Phase
  gedacht):** Item wird **NICHT verworfen**, sondern die Phase wird
  automatisch auf die im `AktivitaetenKatalog` hinterlegte Phase
  korrigiert. Das Item landet damit in der für den Typ vorgesehenen Phase.
- **Transparenz:** Jede Autokorrektur wird im Response-Objekt vermerkt
  (`korrekturen: [{ aktivitaetstyp_name, von_phase, zu_phase }]`). Die
  Vorschau-UI (§4.1, Schritt 3) zeigt dezent darüber „2 KI-Vorschläge
  wurden phasenkorrigiert" mit Detail-Aufklapp.
- Verworfene Items (echte Fehler) werden ebenfalls gemeldet, damit die
  Lehrkraft nicht denkt, sie habe einen kompletten Bauplan bekommen.

### 4.4 Konflikt-Logik

Pseudo-Code für Schritt 4:

```
existing_count = count(LernpaketPhaseAktivitaet where lernpaket_id = X)
if existing_count == 0:
  modus = "ersetzen"   // technisch identisch zu additiv bei 0 Bestand
  skip conflict dialog
else:
  show conflict dialog
  modus ∈ {additiv, ersetzen}

if modus == "ersetzen":
  delete all LernpaketPhaseAktivitaet where lernpaket_id = X
  (über deleteActivityWithTombstoneAndCascade pro Item, damit
   Lernpfad-Membership korrekt nachgezogen wird)

for each item in vorschlag:
  reihenfolge = max(reihenfolge in phase) + 1
  create LernpaketPhaseAktivitaet:
    lernpaket_id = X
    phase = item.phase
    aktivitaet_id = lookup(aktivitaetstyp_name -> AktivitaetenKatalog.id)
    reihenfolge = reihenfolge
    erstellungs_modus = "ki"
    ki_briefing = item.ki_briefing_skizze
    content_status = "draft"
    sync_status = "new"
```

### 4.5 Persistenz der Beschreibung

`Lernpakete.kreativ_briefing` ist ein **simples optionales Textfeld**.

- Wird gespeichert, sobald die Lehrkraft auf „KI-Vorschlag generieren"
  klickt (auch bei Fehlschlag der Generierung).
- Wird **nicht** automatisch wieder gelöscht, wenn die Lehrkraft den
  Vorschlag verwirft. Ihr Briefing ist ihr Eigentum.
- Wird **nicht** geleert, wenn Aktivitäten manuell hinzugefügt werden.
- Wird beim Re-Öffnen des Wizards vorausgefüllt.

### 4.6a Lock-Verhalten während des Wizards (Review-Punkt C)

Der Wizard hält den bestehenden Lernpaket-Lock (`Lernpakete.is_locked`,
`locked_by_email`, `locked_at`). Damit Tab-Crashs, geschlossene Browser
oder Internet-Aussetzer kein Lernpaket dauerhaft blockieren:

- **Heartbeat:** Solange der Wizard offen ist, sendet die Client-UI alle
  ~60 Sekunden einen Lock-Refresh. Dadurch bleibt `locked_at` aktuell.
- **Stale-Lock-Timeout:** Greift der bestehende `lockReaper` /
  `STALE_LOCK_MINUTES`-Mechanismus (30 Min). Bleibt der Heartbeat aus,
  wird der Lock automatisch freigegeben.
- **LLM-Call läuft im Backend:** Selbst wenn die Lehrkraft den Tab
  während des Calls schließt, schreibt das Backend `kreativ_briefing`
  vor dem Call und liefert das Ergebnis nicht aus — kein
  Datenverlust, keine halben Aktivitäten in der DB. Übernahme erfordert
  immer eine bewusste Lehrkraft-Aktion in Schritt 3/4/5.

Kein neuer Lock-Mechanismus nötig — bestehende Infrastruktur reicht.

### 4.6 Re-Edit-Modus

Wenn ein Lernpaket schon ein `kreativ_briefing` hat:

- Wizard öffnet sich **direkt mit gefülltem Textfeld**.
- Header zeigt ein dezentes Badge „Letzte Briefing-Generierung am *Datum*".
- Workflow ist identisch — Lehrkraft kann das Briefing schärfen, neu
  generieren, übernehmen.

### 4.7 Lerntyp-Kontext im Payload — Variante β (Review-Punkt 3)

**Architektonischer Hintergrund:** Ein Lernpaket ist auf dieser Ebene
ein **lerntyp-neutraler Container**. Die Differenzierung nach den vier
Lerntypen (Minimalist, Pragmatiker, Ehrgeizig, Passioniert) passiert erst
zwei Ebenen weiter:

1. **Tab 7 (Lernpfad-Architekt):** Dieselben Aktivitäten werden in vier
   unterschiedliche Sektor-Layouts pro Lerntyp einsortiert.
2. **MBK-Inhaltsgenerierung:** Über `C-Local.lerntyp_schalter` (siehe
   `docs/mbk-integration.md` §4) erhält die MBK den Lerntyp, für den
   gerade gerendert wird.

Eine Aktivität wie „Lückentext zum Steigungsdreieck" existiert in der DB
**einmal** und wird vier Mal in unterschiedlicher Tiefe **ausgespielt**.

**Konsequenz für den Wizard:** Wir übergeben der KI **die
Kurzbeschreibungen aller vier Lerntypen** als reinen
**Hintergrund-Kontext** — nicht als Differenzierungsauftrag. Der
System-Prompt enthält wörtlich folgende Limitierung:

> „Kontext: Die erstellten Aktivitäten werden später für vier
> verschiedene Lerntypen (Minimalist, Pragmatiker, Ehrgeizig,
> Passioniert) in unterschiedlicher Tiefe aufbereitet und ausgespielt.
> Schlage eine **lerntyp-übergreifend tragfähige und vielfältige**
> Aktivitätsfolge vor, die Basiswissen ebenso abdeckt wie optionale
> Transferleistungen. Nimm **keine lerntyp-spezifische Differenzierung**
> auf der Ebene dieser Aktivitäts-Strukturen vor."

**Wirkung:** Die KI baut ein didaktisch ausgewogenes „Buffet" — z. B.
einen niedrigschwelligen Video-Input, eine solide Basis-Übung und eine
komplexere Transferaufgabe am Ende. Aus diesem Buffet kann Tab 7 später
lerntypspezifisch schöpfen, ohne dass die Aktivitäts-Hüllen selbst
Lerntyp-Stempel tragen.

**Quelle der Kurzbeschreibungen:** `MBKGlobalPrompt(def_lerntypen)` bzw.
die vier Einzel-Schlüssel pro Lerntyp im Prompt-Manager. Damit bleibt das
Wording **einheitlich** mit dem, was die MBK selbst sieht — Single Source
of Truth.

**Verworfene Alternativen (zur Dokumentation):**

| Variante | Warum verworfen |
|---|---|
| α: gar kein Lerntyp-Kontext | KI könnte zu einseitig vorschlagen (z. B. nur Wissensabfrage oder nur Transfer). |
| γ: Lehrkraft wählt Lerntyp im Wizard | Bricht Lerntyp-Neutralität des Lernpakets, verkompliziert UX. |

---

## 5. Datenmodell-Erweiterungen (minimal)

### 5.1 Neue Felder

| Entity | Feld | Typ | Pflicht? | Zweck |
|---|---|---|---|---|
| `Lernpakete` | `kreativ_briefing` | `string` | optional | Sandbox-Text der Lehrkraft |
| `Lernpakete` | `kreativ_briefing_updated_at` | `string` (date-time) | optional | „Zuletzt mit KI gefüllt am …" Badge |

**Begründung der Minimalität:** Wir speichern nicht den KI-Vorschlag selbst
und nicht das Konflikt-Modus-Ergebnis. Das ist alles **transient** — sobald
die Aktivitäten angelegt sind, leben sie in `LernpaketPhaseAktivitaet` und
brauchen keinen Zwischenspeicher. Nur die Beschreibung der Lehrkraft ist
„ihr Werk" und bleibt erhalten.

### 5.2 Bestehende Felder, die unverändert weitergenutzt werden

- `AktivitaetenKatalog.{name, phase, is_active}` → Quelle für
  `verfuegbare_aktivitaetstypen` im Payload
- `LernpaketPhaseAktivitaet.{lernpaket_id, phase, aktivitaet_id,
  reihenfolge, erstellungs_modus, ki_briefing, content_status, sync_status}`
  → Ziel der Übernahme
- `Lernpakete.kernbegriffe` → fließt in den Payload ein
- `Lernziele` → optional an die KI mitgegeben

### 5.3 Neue Backend-Endpoints

| Endpoint | Aufgabe | Aufrufer |
|---|---|---|
| `generateLernpaketAktivitaeten` | LLM-Call mit Payload aus §4.2, Validierung der Response gegen §4.3, gibt validiertes JSON zurück | Wizard (Schritt 2) |
| `applyLernpaketWizardProposal` | Legt die Aktivitäten in der DB an, je nach `modus ∈ {additiv, ersetzen}`. Schreibt parallel `kreativ_briefing_updated_at`. Audit-Log. | Wizard (Schritt 5) |

`generateLernpaketAktivitaeten` schreibt zusätzlich `kreativ_briefing` in
die DB (vor dem LLM-Call), damit eine spätere Fehlschlag-Situation nicht zu
Datenverlust führt.

---

## 6. Glossar-System

### 6.1 Zweck

Die Glossar-Sidebar verfolgt drei Ziele:

1. **Begriffsvereinheitlichung** — Lehrkraft und KI sprechen dieselbe
   Sprache (Begriffe aus dem `AktivitaetenKatalog` matchen 1:1 die
   Aktivitätstypen, die wir auch im Backend kennen).
2. **Inspiration** — die Lehrkraft sieht beim Tippen, was alles möglich
   ist.
3. **Komfort** — Klick statt Tippen.

### 6.2 Quellen pro Wizard

| Wizard | Glossar-Quelle | Wie? |
|---|---|---|
| **Tab 3 — Lernpaket** | `AktivitaetenKatalog.name` (gefiltert auf `ist_active`) + die drei Phasen | DB-Query + Konstante |
| **Tab 5 — Themenfeld** | `lib/missionen.js` (problem, entdeckung, recherche, anwendung, transfer, kreativität) + Aufgaben-Subtypen (mit/ohne externes Material, am Computer, …) | Konstanten |
| **Tab 6 — Projekt** | wird mit Tab 6 später spezifiziert | — |

### 6.3 Layout der Sidebar

- **Thematisch gruppiert** (z. B. „Phasen", „Aktivitätstypen").
- **Farbig codiert** pro Gruppe (zarte Background-Tints, keine schreienden
  Farben).
- **Klick auf Chip** → fügt den Begriff an der Cursor-Position ein.
- **Drag-and-Drop (Review-Punkt 6.3):** Chip kann zusätzlich per
  Drag-and-Drop in die Textarea gezogen werden. Wird beim Drop an der
  Cursor-Position eingefügt (gleiche Logik wie Klick, nur per Gesture).
  Praktisch auf Tablets, wo der Klick-Workflow fummelig sein kann.
- **Hover-Tooltip** zeigt eine 1-Satz-Beschreibung (z. B. „Lückentext —
  SuS füllen Lücken in einem vorgegebenen Text aus."). **Wichtig:** Diese
  Beschreibung ist die **identische** Konstante, die auch ins KI-Payload
  fließt (§4.2, Feld `description`) — Single Source of Truth.

### 6.4 Mini-Anleitung („Was macht eine gute Beschreibung aus?")

**Statisch, als Hilfe-Box unter dem Textfeld.** MVP-Inhalt (vorläufig):

> 💡 **So gelingt eine gute Beschreibung**
> - Erkläre den **Sinn** des Lernpakets: Was sollen die SuS am Ende
>   können?
> - Beschreibe **stichpunktartig den Ablauf**, wenn du eine Vorstellung
>   hast: „Erst ein kurzes Video, dann eine Übung mit Lückentext, dann
>   ein Miniquiz."
> - Erwähne **Aktivitätstypen** aus dem Glossar, wenn du sie konkret
>   willst — sonst schlägt die KI selbst passende vor.
> - **Du musst keine perfekten Sätze schreiben.** Stichpunkte und
>   Fragmente reichen.

Der Text liegt als Konstante in einer neuen Datei
`lib/wizardHilfeTexte.js` (eine Datei für alle drei Wizards, einfach
erweiterbar).

---

## 7. Strukturskizze: Tab 5 + Tab 6 (für spätere Iterationen)

**Tab 5 — Themenfeld-Wizard:**

- Trigger: Klick auf Themenfeld in Tab 5, Button „🪄 Allgemeine Aufgaben
  vorschlagen lassen"
- Beschreibung: was sollen die SuS in diesem Themenfeld auf
  Themenfeld-Ebene **außerhalb** der Lernpakete tun?
- KI-Output: Liste von `AllgemeineAufgabe`-Skizzen mit `mission_type` und
  `aufgaben_typ`, **immer additiv** angelegt.
- Glossar: Mission-Types aus `lib/missionen.js`, Aufgaben-Subtypen,
  evtl. Unterscheidung „am Computer" vs. „mit externem Material".

**Tab 6 — Projekt-Wizard:**

- Trigger: Top-Level in Tab 6, „🪄 Projektideen vorschlagen lassen"
- Beschreibung: welche Projekte denkbar sind (offen, frei)
- KI-Output: Projekt-Anker oder Ebene-3-`AllgemeineAufgabe`-Vorschläge,
  immer additiv.

Beide werden **nach** Live-Erfahrung mit Tab 3 detailliert spezifiziert.

---

## 8. Architektur & wiederverwendbare Komponenten

Damit Tab 5 + 6 später schnell folgen können, ziehen wir generische Teile
in eigene Module:

| Komponente | Datei (vorgeschlagen) | Wird wiederverwendet in |
|---|---|---|
| `WizardSandboxModal` | `components/wizards/WizardSandboxModal.jsx` | Tab 3, 5, 6 |
| `WizardGlossarSidebar` | `components/wizards/WizardGlossarSidebar.jsx` | Tab 3, 5, 6 |
| `WizardProposalPreview` | `components/wizards/WizardProposalPreview.jsx` | Tab 3, 5, 6 (mit unterschiedlichen Renderern) |
| `WizardConflictDialog` | `components/wizards/WizardConflictDialog.jsx` | Tab 3 (Tab 5/6 nutzen ihn nicht — additiv-only) |
| `lib/wizardHilfeTexte.js` | Konstanten | alle drei Wizards |

**Wizard-spezifische Teile** (also alles, was wirklich nur für Tab 3 gilt)
landen in `components/workspace/lernpaketWizard/` (LernpaketWizardEntry-
Button, LernpaketWizardRenderer für die Vorschau, etc.).

---

## 9. Offene Fragen & Risiken

| # | Frage / Risiko | Vorschlag (vorläufig) |
|---|---|---|
| 1 | **Was, wenn die KI eine Aktivität in der falschen Phase einsortiert?** | **Geklärt durch Review-Punkt B (§4.4):** Statt stumm zu filtern wird die Phase **automatisch korrigiert** auf die im `AktivitaetenKatalog` hinterlegte Phase. Korrekturen werden im Response transparent gemeldet und in der Vorschau-UI dezent angezeigt. |
| 2 | **Wer darf den Wizard starten?** | Gleiche RBAC-Regeln wie für manuelles Anlegen von Aktivitäten (`kannAktivitaetErstellen`). Kein neues Recht nötig. |
| 3 | **Sollen Audit-Logs unterscheiden zwischen „KI-erstellt" und „manuell erstellt"?** | Ja, via `LernpaketPhaseAktivitaet.erstellungs_modus = 'ki'` — schon vorhanden, kein Mehraufwand. |
| 4 | **Was passiert mit `lernpaketAggregateGuardian` / `is_complete`-Flag?** | Neue Aktivitäten haben `content_status: 'draft'` → das Aggregat-Flag wird **nicht** auf `is_complete` gesetzt. Das ist korrekt: KI hat nur die Hüllen gebaut, die Inhalte fehlen noch. |
| 5 | **Race Condition / Tab-Crash während Wizard offen** | **Geklärt durch Review-Punkt C (§4.6a):** Bestehender Lock-Mechanismus (`Lernpakete.is_locked`) + Heartbeat alle ~60 Sek + Stale-Lock-Timeout via `lockReaper`. LLM-Call ist atomar: schließt der Browser, gehen keine halben Daten in die DB. |
| 6 | **Wie viele Tokens kostet ein typischer Wizard-Lauf? Welches Modell?** | Schätzung: ~2–3k Input + ~1k Output. Pro Lernpaket einmal. Da nur **Strukturdaten** generiert werden und keine tiefgreifenden Texte: **Default-Modell `gpt_5_mini` (bzw. `gemini_3_flash` als günstige Alternative).** Komplexere Modelle nur, wenn Telemetrie zeigt, dass Qualität nicht reicht. Token-Verbrauch + Erfolgs-/Korrekturrate werden geloggt. |
| 7 | **Soll der Wizard mehrere Vorschläge nebeneinander anbieten („A oder B")?** | Aus Komplexitätsgründen für den MVP: **nein**. „Anders versuchen" + Briefing nachschärfen ist der vorgesehene Weg. |
| 8 | **Mehrsprachigkeit der Begriffsglossare?** | App ist aktuell DE-only — kein Issue. Bei späterem i18n ggf. nachziehen. |
| 9 | **Lerntyp-Differenzierung im Wizard?** | **Geklärt durch Review-Punkt 3, Variante β (§4.7):** Vier Lerntyp-Kurzbeschreibungen werden als Hintergrund-Kontext mitgegeben, aber KI baut **keine** lerntyp-spezifische Differenzierung in die Aktivitäts-Hüllen — Lernpaket bleibt lerntyp-neutral. |

---

## 10. Iterationsplan (ohne Zeitangaben)

| Phase | Inhalt | Abhängigkeiten |
|---|---|---|
| **0 — Konzept-Abnahme** | Dieses Dokument durchsprechen, Fragen aus §9 schließen, freigeben | — |
| **1 — Datenmodell** | `Lernpakete.kreativ_briefing` + `…_updated_at` ergänzen | Phase 0 |
| **2 — Backend** | `generateLernpaketAktivitaeten` + `applyLernpaketWizardProposal` | Phase 1 |
| **3 — Wiederverwendbare Bausteine** | `WizardSandboxModal`, `WizardGlossarSidebar`, `WizardProposalPreview`, `WizardConflictDialog`, `wizardHilfeTexte.js` | Phase 0 |
| **4 — Lernpaket-Wizard zusammenbauen** | Trigger-Button in Tab 3 + Wizard-Renderer + Integration | Phase 2 + 3 |
| **5 — Praxis-Test** | Kollegen probieren am echten Beispiel | Phase 4 |
| **6 — Tab 5** | Themenfeld-Wizard (mit denselben Bausteinen) | Phase 5 |
| **7 — Tab 6** | Projekt-Wizard | Phase 6 |

---

## 11. Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| 0.1 | 2026-05-12 | Initialer Konzeptentwurf nach Klärungsgespräch (Geltungsbereich: pro Lernpaket; Glossar = Aktivitätstypen + Phasen; Konflikt-Dialog am Ende mit Anzeige des Ist-Zustands) |
| 0.2 | 2026-05-12 | Eingearbeitete Review der Planungsabteilung: **(A)** Aktivitätstyp-`description` ins Payload (§4.2, §6.3 — Single Source of Truth Glossar/KI); **(B)** Phase-Mismatch wird auto-korrigiert statt verworfen, mit transparenter Meldung in der Vorschau (§4.3); **(C)** Lock-Heartbeat + Stale-Lock-Timeout während Wizard offen ist (§4.6a); **(β)** Vier-Lerntypen-Kontext als Hintergrund-Wissen mitgegeben, lerntyp-neutrale Aktivitäts-Hüllen bleiben erhalten (§4.2, §4.7 mit Begründung und verworfenen Alternativen α/γ); **(Glossar)** Drag-and-Drop zusätzlich zu Klick (§6.3); **(Telemetrie)** Default-Modell `gpt_5_mini`, Logging von Token-Verbrauch + Korrekturrate (§9.6). |