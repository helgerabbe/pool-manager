# Malte – Bauanleitung v2: Vom Pool-Manager zum Moodle-SCORM

> **Version 2 · Stand 2026-06-14**
> Diese Version ersetzt die ursprüngliche Bauanleitung (`docs/malte-anleitung-mbk.md`).
> Sie integriert die Learnings aus dem ersten real gebauten Modul
> („Einführung in die Poolzeit") und Claudes Feedback (`2026-06-13-bauanleitung-abgleich.md`).
>
> **Strategische Entscheidung:** Das Portal (Poolzeit-Manager, Lerntagebuch, Cockpit)
> bleibt eine **eigenständige Web-App**. Moodle ist nur Host für die SCORM-Pakete
> pro Einheit. Phase B (Portal-Nachbau) bleibt erhalten.

---

## 1. Was du zur Verfügung hast

### Payloads aus dem Base44-Export-Center

Nachdem eine Einheit im Export-Center fertiggestellt wurde, lädst du die
Air-Gap-Payloads als **ZIP-Datei** herunter (Button „Air-Gap-Payloads herunterladen").
Das ZIP enthält sechs JSON-Dateien:

```
payloads/
  0-ui-config.json
  1-system-context.json
  2-structure.json
  3-task-content.json
  4-micro-briefings.json
  5-systembausteine.json
```

Diese Dateien checkst du ins GitHub-Repo ein unter `kurse/<slug>/payloads/`.
**GitHub ist die Quelle der Wahrheit** – versioniert, diffbar, teamfähig.

### Generator & Engine (im GitHub-Repo)

Im selben Repo liegen die wiederverwendbaren Kern-Komponenten:

| Artefakt | Pfad | Zweck |
|---|---|---|
| Generator | `core/build.mjs` | Erzeugt mit EINEM Befehl alle HTML-Dateien + Manifest |
| Engine | `core/assets/mbk-runtime.js` | SCORM-Runtime mit 18 Aktivitätstypen, Fortschritts-Tracking |
| Design-Kit | `core/assets/design-kit.css` | UI-Styling (Farben, Fonts, Layout) |

### Referenz (bei Bedarf)

Der Source-Code der Autoren-App liegt im GitHub-Repo. Der Schülerbereich
(`pages/schueler/`, `components/schueler/`) dient als **visuelle Referenz**
für den Portal-Nachbau (Phase B). Du baust eigenständig – der Code ist nur
Orientierung, nicht Blaupause.

---

## 2. Die Air-Gap-Payloads – deine zentralen Bauanleitungen

### Die sechs Payload-Typen

| # | Payload | prompt_type | Enthält |
|---|---------|-------------|---------|
| **0** | UI-Config | `mbk_ui_config` | CSS-Variablen, Tab-Bar-HTML, Default-Header-HTML |
| **1** | System-Kontext | `mbk_system_context` | Stammdaten, Nomenklatur, globale Prompts, ALLE Verträge |
| **2** | Struktur | `mbk_structure_payload` | Themenfelder, Lernpakete, 4× Lernpfade, Gating, SCORM-File-Mapping |
| **3** | Aufgabeninhalte | `mbk_task_content_payload` | Inhalte pro Lernpaket/Aufgabe (field_values, MasterAufgaben, Materialien) |
| **4** | Micro-Briefings | `mbk_micro_payload` | Briefings für KI-Aktivitäten und offene Aufgaben |
| **5** | Systembausteine | `mbk_systembaustein_payload` | Briefings pro System-Baustein × Lerntyp |

### Die sieben Verträge (alle in Payload 1)

1. **`scorm_delivery_contract`** → Welches Item wird in welche SCORM-Datei verpackt
2. **`dashboard_gating_engine`** → Wie Sichtbarkeit/Freischaltung funktioniert
3. **`onboarding_contract`** → Die 4 Onboarding-Elemente VOR der Dashboard-Wahl
4. **`master_anzeige_modus_contract`** → Shuffle vs. Alle bei Master-Varianten
5. **`update_lifecycle_contract`** → Was beim Update einer bereits veröffentlichten Einheit passiert
6. **`snapshot_priority_contract`** → Fertige Snapshots haben Vorrang vor KI-Briefings
7. **`schueler_arbeitsumgebung_contract`** → Die komplette methodische Hülle (Cockpit, Poolzeit, Lerntagebuch, Merkheft)

---

## 3. Deine Arbeits-Reihenfolge – der Generator-Workflow

> **Zentrales Learning aus dem ersten Modul:** Der Generator (`core/build.mjs`)
> ersetzt den früheren Hand-Bau. Ein Befehl erzeugt ALLE HTML-Dateien plus
> `imsmanifest.xml` aus den Payloads. Das ist deterministisch, wiederholbar
> und kursübergreifend konsistent.

### Phase A: Grundlagen verstehen

**A1.** Entpacke das Payload-ZIP und lege die JSONs unter
`kurse/<slug>/payloads/` ab.

**A2.** Lies Payload 1 (`1-system-context.json`) KOMPLETT. Das ist dein
Regelwerk. Alle sieben Verträge sind dort.

**A3.** Lies die globalen Prompts, die in Payload 1 als `direct_lookups`
referenziert sind – vor allem `mission_statement`, `persona_global`,
`lerntypen_definition`, `struktur_definition`.

### Phase B: Die Hülle bauen (einmalig, für alle Einheiten)

**Wichtig**: Die methodische Hülle wird EINMAL gebaut. Sie ändert sich nicht
pro Einheit – nur die Inhalte an den Anker-Punkten.

**B1.** Lies den `schueler_arbeitsumgebung_contract` in Payload 1.

**B2.** Öffne im GitHub den Schülerbereich als visuelle Referenz:
- `pages/schueler/` → alle Schüler-Seiten
- `components/schueler/` → alle Schüler-Komponenten

**B3.** Baue die Hülle in dieser Reihenfolge:
1. **Cockpit** (`StudentArea`): FachKacheln, StartButton, SelbstNotizKarte, RückblickLeiste
2. **Poolzeit** (`PoolzeitStart`): 5-Schritt-Flow (Zeit → Planung → Einheit → Wechsel-Notiz → Abschluss)
3. **Lerntagebuch** (`Lerntagebuch`): chronologische Liste mit Typ-Icons
4. **FachSeite** (`FachSeite`): EinheitKacheln pro Fach
5. **EinheitOnboarding** (`EinheitOnboarding`): 4 Elemente (Einführung → Fragenblock → Diagnose → KI-Lerntyp)
6. **EinheitDashboard** (`EinheitDashboard`): PfadNavigation, Zeit-Tracker, Lernlandkarte, Dashboard-Items

### Phase C: Generator starten

**C1.** Payload 0 (`0-ui-config.json`) enthält CSS-Variablen, Tab-Bar-HTML
und Header-Template. Der Generator bindet sie automatisch ein.

**C2.** Führe den Generator aus:

```bash
node core/build.mjs kurse/<slug>
```

**Das erzeugt in `kurse/<slug>/build/`:**
- `index.html` – Einstieg (Landing Page der Einheit)
- `dashboard-minimalist.html`
- `dashboard-pragmatiker.html`
- `dashboard-ehrgeizig.html`
- `dashboard-passioniert.html`
- `task-<lernpaket_id>.html` (pro Lernpaket)
- `tasks-themenfeld-<id>.html` (pro Themenfeld mit Ebene-2-Aufgaben)
- `projekte-einheit-<id>.html` (falls Ebene-3-Aufgaben existieren)
- `system-<lerntyp>-<baustein_id>.html` (pro System-Baustein × Lerntyp)
- `imsmanifest.xml` (SCORM-Manifest)

### Phase D: SCORM-Paket bereitstellen

**D1.** Der Generator erzeugt **ein einziges SCO** (`index.html` als Einstieg).
Interne Navigation erfolgt über Links im HTML. Das ist der Moodle-Standard –
keine vielen SCORM-Items, kein komplexes Tracking über Dateigrenzen hinweg.

**D2.** Zippe den `build/`-Ordner und lade ihn in den Supabase-Storage-Bucket
hoch (`module-scorm/<scormPath>`). Von dort wird das SCORM-Paket automatisch
in Moodle aktualisiert.

---

## 4. Die Engine (`mbk-runtime.js`)

Der Generator bettet die eigene Engine `core/assets/mbk-runtime.js` in jede
HTML-Datei ein. Sie enthält:

- **Renderer-Registry** für 18 Aktivitätstypen: text, video, link, lehrwerk,
  confirm, open, quiz, test, miniquiz, diagnose, qblock, lueckentext, match,
  order, bildbeschriftung, zeitleiste, ki_check, ki_tutor, snapshot, mindmap
- **SCORM-Bridge** für Moodle-Kommunikation (SCO-Status, Punktzahl)
- **Fortschritts-Tracking** nach Supabase (`module_progress`)
- **Cloud-Save** für Schüler-Daten

Die früheren Base44-Plugins (`lib/runtime/plugin_*.js`) werden **nicht**
verwendet. Die eigene Engine ist der wiederverwendbare Kern über alle Kurse.

---

## 5. KI-Aktivitäten – Live-Feedback zur Laufzeit

KI-Aktivitäten (`ki_check`, `ki_tutor`) laufen **live zur Laufzeit** über
einen Make.com-Webhook. Es werden KEINE statischen HTML-Fragmente vorab
generiert.

- Der Aufgabentext (`instruction`) ist immer sichtbar für den Schüler.
- Die `kriterien` bleiben nur für die KI sichtbar (werden im Hintergrund
  an den Webhook gesendet).
- Es gibt keinen manuellen „Fragment-Merger"-Schritt mehr. Der Generator
  erzeugt die kompletten HTML-Dateien – KI-Aufgaben-Platzhalter werden
  zur Laufzeit von der Engine befüllt.

---

## 6. Checkliste pro Einheit

Bevor du eine Einheit als „fertig" markierst, prüfe:

- [ ] Alle 4 Dashboard-HTMLs existieren (auch wenn ein Pfad leer ist)
- [ ] Jedes Lernpaket hat seine `task-<id>.html`
- [ ] Jedes Themenfeld mit Ebene-2-Aufgaben hat sein Bündel-HTML
- [ ] Projekte (Ebene 3) haben ihr Bündel-HTML (falls vorhanden)
- [ ] Jeder System-Baustein hat sein `system-<lerntyp>-<id>.html`
- [ ] Die Gating-Logik pro Sektor/Bündel ist korrekt (sequenziell vs. frei)
- [ ] Der Weiter-Button erscheint gemäß `abschluss_bedingung`
- [ ] Header/Footer in jeder Datei gemäß Payload 0
- [ ] `imsmanifest.xml` existiert mit EINEM SCO (`index.html` als Einstieg)
- [ ] Alle Snapshots aus dem Payload sind eingebaut (nicht neu generiert)
- [ ] KI-Aktivitäten sind als Live-Webhook-Platzhalter eingebaut (keine statischen Fragmente)
- [ ] SCORM-Zip ist im Supabase-Bucket und in Moodle eingebunden

---

## 7. Der Datenfluss im Überblick

```
Base44 Export-Center
    │
    ├─→ „Air-Gap-Payloads herunterladen" (ZIP)
    │       │
    │       └─→ GitHub-Repo: kurse/<slug>/payloads/*.json
    │               │
    │               ▼
    │         Generator: node core/build.mjs kurse/<slug>
    │               │
    │               ├─ core/assets/mbk-runtime.js  (Engine)
    │               ├─ core/assets/design-kit.css  (Styling)
    │               │
    │               └─→ kurse/<slug>/build/
    │                    ├── index.html
    │                    ├── dashboard-*.html
    │                    ├── task-*.html
    │                    ├── system-*.html
    │                    └── imsmanifest.xml
    │                        │
    │                    ZIP + Upload
    │                        ▼
    │               Supabase Storage-Bucket
    │               module-scorm/<scormPath>
    │                        │
    │                        ▼
    │               Moodle: eine SCORM-Aktivität pro Einheit
    │                        │
    │                        ├─ Schüler arbeitet → Fortschritt zurück
    │                        │   nach Supabase (module_progress)
    │                        └─ Lerncoach-Dashboard liest Telemetrie
```

---

## 8. Noch Fragen?

- Jeder Payload enthält einen `meta`-Block mit Version, Hash und Zeitstempel
- Die `schema_version` zeigt dir die Spec-Version (`airgap-1.13.0`)
- Der `system_context_hash` zeigt, ob sich das Regelwerk geändert hat
- Bei Hash-Drift: Payloads im Export-Center neu herunterladen