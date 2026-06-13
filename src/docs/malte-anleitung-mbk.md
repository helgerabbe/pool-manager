# Malte – Bauanleitung: Vom Pool-Manager zum Moodle-SCORM

## 1. Was du zur Verfügung hast

Nachdem eine Einheit im Export-Center nach Supabase exportiert wurde, findest
du dort alle Daten, die du brauchst – komplett ohne Base44-Zugang.

### Supabase-Tabellen (Übersicht)

| Tabelle | Inhalt | Feste Schlüssel |
|---------|--------|-----------------|
| `einheiten` | Die exportierte Einheit (Fach, Jahrgang, Titel, lernpfade_konfiguration, onboarding_konfiguration) | `id` |
| `themenfelder` | Themenfelder der Einheit (Titel, Reihenfolge) | `einheit_id` |
| `lernpakete` | Lernpakete der Einheit (Titel, Dauer, Kernbegriffe) | `einheit_id` |
| `lernpaket_aktivitaeten` | Aktivitäten pro Lernpaket (Phase, field_values, KI-Modus) | `lernpaket_id` |
| `master_aufgaben` | Master-Aufgaben (Varianten für KI-Klone) | `activity_id` |
| `lernziele` | Lernziele pro Lernpaket (Fachsprache + Schüler-Übersetzung) | `lernpaket_id` |
| `allgemeine_aufgaben` | Allgemeine Aufgaben (Ebene 2+3, Projekte, Bündel) | `einheit_id` |
| `system_bausteine` | System-Bausteine (Einführung, Diagnose, Lernlandkarte…) | `baustein_id` (unique) |
| `aktivitaeten_katalog` | Glossar aller Aktivitätstypen (Name, Phase, form_schema) | `id` |
| `inhalt_snapshots` | Fertige, schülergerechte KI-Inhalte (Onboarding, Themenfeld-Einführungen…) | `einheit_id` |
| `mbk_global_prompts` | Zentrale Bauanleitungen (Mission, Lerntypen, Personen, UI-Design, Arbeitsumgebung) | `schluessel` (unique) |
| `export_prompts` | Die generierten Air-Gap-Payloads 0–5 (KI-Bauanleitungen pro Einheit) | `einheit_id`, `prompt_type` |

### GitHub

Der Source-Code der Autoren-App liegt im Repo. Für dich relevant:
- **Referenz**: der gesamte Schülerbereich unter `pages/schueler/` und `components/schueler/`
- **SCORM-Runtime-Plugins**: `lib/runtime/plugin_*.js` (Quiz, Sortierung, Bildbeschriftung…)
- **Docs**: `docs/mbk-air-gap-uebergabe.md` (Vertragsdokumentation)

**Wichtig**: Du baust NICHT den existierenden Code nach – du baust EIGENSTÄNDIG auf
Basis der Air-Gap-Payloads. Der Code dient als visuelle und funktionale Referenz.

---

## 2. Die Air-Gap-Payloads – deine zentralen Bauanleitungen

Jeder Export-Prompt in `export_prompts` ist ein Air-Gap-Payload mit einem
`prompt_type`. Das `content`-Feld ist ein JSON-String.

### Die sechs Payload-Typen

| Payload | prompt_type | Enthält |
|---------|-------------|---------|
| **0** | `mbk_ui_config` | CSS-Variablen, Tab-Bar-HTML, Default-Header-HTML |
| **1** | `mbk_system_context` | Stammdaten, Nomenklatur, globale Prompts, ALLE Verträge |
| **2** | `mbk_structure_payload` | Struktur der Einheit: Themenfelder, Lernpakete, 4× Lernpfade mit Sektoren, Gating, SCORM-File-Mapping |
| **3** | `mbk_task_content_payload` | Inhalte pro Lernpaket/Aufgabe (field_values, MasterAufgaben, Materialien) |
| **4** | `mbk_micro_payload` | KI-Briefings (nur für KI-Aktivitäten) |
| **5** | `mbk_systembaustein_payload` | Briefings pro System-Baustein × Lerntyp |

### Die sieben Verträge (alle in Payload 1)

In Payload 1 findest du unter diesen Keys die kompletten Spielregeln:

1. **`scorm_delivery_contract`** → Welches Item wird in welche SCORM-Datei verpackt
2. **`dashboard_gating_engine`** → Wie Sichtbarkeit/Freischaltung funktioniert
3. **`onboarding_contract`** → Die 4 Onboarding-Elemente VOR der Dashboard-Wahl
4. **`master_anzeige_modus_contract`** → Shuffle vs. Alle bei Master-Varianten
5. **`update_lifecycle_contract`** → Was beim Update einer bereits veröffentlichten Einheit passiert
6. **`snapshot_priority_contract`** → Fertige Snapshots haben Vorrang vor KI-Briefings
7. **`schueler_arbeitsumgebung_contract`** → Die komplette methodische Hülle (Cockpit, Poolzeit, Lerntagebuch, Merkheft)

---

## 3. Deine Arbeits-Reihenfolge (Schritt für Schritt)

### Phase A: Grundlagen verstehen

**A1.** Öffne Supabase → SQL Editor. Führe diese Abfragen aus, um dich zu
orientieren:

```sql
-- Welche Einheit ist exportiert?
SELECT id, fach, titel_der_einheit, jahrgangsstufe FROM einheiten;

-- Alle Payloads dieser Einheit (ersetze <einheit_id>)
SELECT prompt_type, reference_id, content FROM export_prompts
WHERE einheit_id = '<einheit_id>' ORDER BY prompt_type, reference_id;

-- Alle globalen Prompts (deine Bauanleitungen)
SELECT schluessel, anzeigename, kategorie FROM mbk_global_prompts
WHERE ist_aktiv = true ORDER BY sort_order;
```

**A2.** Lies Payload 1 (`mbk_system_context`) KOMPLETT. Druck ihn aus. Das ist
dein Regelwerk. Alle sieben Verträge sind dort – ohne sie zu verstehen, baust
du falsch.

**A3.** Lies die globalen Prompts, die in Payload 1 als `direct_lookups`
referenziert sind – vor allem `global_mission_statement`, `def_lerntypen`,
`def_struktur`, `global_persona`.

### Phase B: Die Hülle bauen (einmalig, für alle Einheiten)

**Wichtig**: Die methodische Hülle (Cockpit, Poolzeit, Lerntagebuch,
Einheit-Dashboard) wird EINMAL gebaut. Sie ändert sich nicht pro Einheit –
nur die Inhalte an den Anker-Punkten.

**B1.** Lies den `schueler_arbeitsumgebung_contract` in Payload 1 genau.
Er beschreibt alle fünf Ebenen der Hülle und definiert Anker-Punkte, an denen
später einheits-spezifische Inhalte eingehängt werden.

**B2.** Öffne im GitHub den Schülerbereich als Referenz:
   - `pages/schueler/` → alle Schüler-Seiten (StudentArea, PoolzeitStart, FachSeite, EinheitOnboarding, EinheitDashboard, Lerntagebuch)
   - `components/schueler/` → alle Schüler-Komponenten

**B3.** Baue mit Claude Code die Hülle in dieser Reihenfolge:
   1. **Cockpit** (`StudentArea`): FachKacheln, StartButton, SelbstNotizKarte, RückblickLeiste
   2. **Poolzeit** (`PoolzeitStart`): 5-Schritt-Flow (Zeit → Planung → Einheit → Wechsel-Notiz → Abschluss)
   3. **Lerntagebuch** (`Lerntagebuch`): chronologische Liste mit Typ-Icons
   4. **FachSeite** (`FachSeite`): EinheitKacheln pro Fach
   5. **EinheitOnboarding** (`EinheitOnboarding`): 4 Elemente (Einführung → Fragenblock → Diagnose → KI-Lerntyp)
   6. **EinheitDashboard** (`EinheitDashboard`): PfadNavigation, Zeit-Tracker, Lernlandkarte, Dashboard-Items

**Claude-Code-Prompt-Tipp**: Gib ihm den `schueler_arbeitsumgebung_contract` als
Kontext und verweise auf die existierenden Dateien als Referenz. Sag ihm: „Baue
eine Neu-Implementierung, die sich visuell und funktional an diesen Dateien
orientiert, aber eigenständig und wartbar ist."

### Phase C: Payload 0 – UI-Design einlesen

**C1.** Lies Payload 0 (`mbk_ui_config`). Er enthält:
- `css_variables`: alle Farben, Fonts, Radien als CSS-Custom-Properties
- `tab_bar_html`: das HTML-Snippet für die Dashboard-Tab-Bar (mit den 4 Lerntypen)
- `default_header_html`: das Header-Template

**C2.** Lies den `def_ui_design`-Eintrag aus `mbk_global_prompts`. Er enthält
die komplette UI-Spezifikation mit exakten Pixel-Werten, allen 13 Komponenten-
Spezifikationen und der vollständigen Farbpalette.

**C3.** Wende beide auf die Hülle an – CSS-Variablen in den `<head>`, Tab-Bar
und Header als Templates, alle Komponenten-Spezifikationen als Bauplan.

### Phase D: Die Inhalte einer Einheit bauen

**D1.** Lies Payload 2 (`mbk_structure_payload`). Er enthält:
- `einheit`: Metadaten (Fach, Jahrgang, Titel, Gesamtziele, Update-Strategie)
- `einheit.onboarding`: die konkreten Onboarding-Inhalte (aus `inhalt_snapshots`)
- `themenfelder`: alle Themenfelder mit ihren Lernpaketen und Lernzielen
- `lernpfade`: pro Lerntyp die komplette Sektor-Struktur mit Items
- `lernpfade[lerntyp][sektor].modus` und `.freischalt_bedingung`: das Gating
- `lernpfade[lerntyp][sektor].items[].initial_status` und `.abschluss_bedingung`
- `scorm_file_mapping`: die Quelle-ID → Dateiname-Zuordnung
- `system_bausteine`: die referenzierten System-Bausteine

**D2.** Baue aus dem `scorm_file_mapping` die Dateistruktur. Für JEDEN Eintrag:
- `kind: 'dashboard'` → eine `dashboard-<lerntyp>.html`
- `kind: 'lernpaket'` → eine `task-<lernpaket_id>.html`
- `kind: 'themenfeld_bundle'` → eine `tasks-themenfeld-<id>.html`
- `kind: 'projekt_bundle'` → eine `projekte-einheit-<id>.html`
- `kind: 'system_baustein'` → eine `system-<lerntyp>-<baustein_id>.html`

**D3.** Für jede generierte Datei: Header und Footer aus Payload 0 einweben
(`injection_points.title`, `injection_points.back_targets`).

**D4.** Die Dashboard-HTMLs (`dashboard-*.html`) sind reine Hüllen mit:
- Tab-Bar (aus Payload 0)
- Platzhalter-Container für die Sektoren/Items dieses Lerntyps
- Gating-Logik gemäß `dashboard_gating_engine`

### Phase E: Aufgaben-Inhalte einfüllen

**E1.** Lies Payload 3 (`mbk_task_content_payload`). Jedes Item enthält:
- Lernpakete: Titel, Lernziele, Aktivitäten (mit field_values, MasterAufgaben)
- AllgemeineAufgaben: Aufgabenstellung, Materialien, Erwartungshorizont, Brian-Dialog

**E2.** Für jedes Item die Inhalte in die entsprechende SCORM-Datei einbauen.

**E3.** KI-Aktivitäten (`erstellungs_modus === 'ki'`): Diese haben in Payload 3
NUR Platzhalter (`placeholder_activity_ids`). Die eigentlichen Inhalte kommen
aus Payload 4 (`mbk_micro_payload`).

**E4.** Lies Payload 4. Jedes Micro-Briefing enthält:
- `target.reference_id` → verweist auf den Platzhalter in Payload 3
- `gps` → didaktische Position (Fach → Themenfeld → Lernpaket → Phase)
- `blueprint.ki_briefing` → was die KI bauen soll (Standard- oder Offen-Variante)
- `output_contract` → wie das Ergebnis ausgeliefert wird (Fragment + Marker)

**E5.** Generiere für jedes Micro-Briefing ein HTML-Fragment
(`fragment-<activity_id>.html`). Der Merger (du) setzt es dann an der
Platzhalter-Position in die Hülle ein.

### Phase F: System-Bausteine

**F1.** Lies Payload 5 (`mbk_systembaustein_payload`). Jedes Briefing pro
Baustein × Lerntyp enthält:
- `baustein`: titel, icon, export_instruktion
- `lerntyp_pfad`: die komplette Sektor-Struktur dieses Lerntyps (Kontext)
- `lernlandkarte`: reduzierte Lernlandkarte (Pakete + Lernziele)
- `output_contract.filename`: z. B. `system-minimalist-sys_einfuehrung.html`

**F2.** Generiere für jedes Briefing eine HTML-Datei. Der Baustein wird im
Dashboard an der entsprechenden Position eingehängt (die `instance_id` aus
Payload 2 verweist auf die Position im Lernpfad).

---

## 4. Die SCORM-Runtime-Plugins

Aus dem GitHub-Repo brauchst du die Plugins unter `lib/runtime/`:
- `plugin_quiz.js` → Miniquiz, Einstiegsdiagnose
- `plugin_sortable.js` → Reihenfolge sortieren
- `plugin_image_labeling.js` → Bildbeschriftung
- `plugin_static_media.js` → Text lesen, Video/Audio, Link öffnen

Diese Plugins sind reine JavaScript-Module ohne externe Abhängigkeiten. Du
kannst sie 1:1 in deine generierten HTML-Dateien einbetten.

---

## 5. Checkliste pro Einheit

Bevor du eine Einheit als „fertig" markierst, prüfe:

- [ ] Alle 4 Dashboard-HTMLs existieren (auch wenn ein Pfad leer ist)
- [ ] Jedes Lernpaket hat seine `task-<id>.html`
- [ ] Jedes Themenfeld mit Ebene-2-Aufgaben hat sein Bündel-HTML
- [ ] Projekte (Ebene 3) haben ihr Bündel-HTML
- [ ] Jeder System-Baustein hat sein `system-<lerntyp>-<id>.html`
- [ ] KI-Fragmente sind an den Platzhalter-Positionen eingewoben
- [ ] Die Gating-Logik pro Sektor/Bündel ist korrekt (sequenziell vs. frei)
- [ ] Der Weiter-Button erscheint gemäß `abschluss_bedingung`
- [ ] Header/Footer in jeder Datei gemäß Payload 0
- [ ] `imsmanifest.xml` existiert und listet ALLE Dateien (Dashboards zuerst)
- [ ] Das Manifest referenziert die 4 Dashboards als erste `<item>`-Einträge
- [ ] Alle Snapshots aus `inhalt_snapshots` sind eingebaut (nicht neu generiert)

---

## 6. Empfohlene Claude-Code-Strategie

### Arbeitsprinzip

Arbeite **Payload für Payload**, nicht „alles auf einmal".

1. **Session 1**: Payload 1 verstehen → Prompt: „Fasse mir die 7 Verträge in eigenen Worten zusammen"
2. **Session 2**: Hülle bauen (Cockpit, Poolzeit, Lerntagebuch) → Referenz: `pages/schueler/*`
3. **Session 3**: Payload 0 + Hülle stylen
4. **Session 4**: Payload 2 einlesen → SCORM-Dateistruktur generieren
5. **Session 5+**: Payload 3, 4, 5 → Inhalte einfüllen
6. **Session n**: `imsmanifest.xml` + Endkontrolle

### Prompt-Muster

```
Ich arbeite an einem Moodle-SCORM-Export. Hier ist Payload 2 (mbk_structure_payload)
als JSON. Das ist das Inhaltsverzeichnis einer Unterrichtseinheit.

[Payload 2 einfügen]

Generiere mir aus dem `scorm_file_mapping` die komplette Dateistruktur als
leere HTML-Dateien mit Header/Footer aus diesen CSS-Variablen:

[CSS-Variablen aus Payload 0 einfügen]

Jede Datei muss valides, standalone HTML5 sein (kein React, kein Framework).
960×600 Viewport, kein Gesamtseiten-Scrollen. Tablet-first.

Die Gating-Logik folgt diesen Regeln (aus dashboard_gating_engine):
[Gating-Regeln einfügen]
```

---

## 7. Der Datenfluss im Überblick

```
Export-Center (Base44)
    │
    ├─→ exportEinheitToSupabase()
    │       │
    │       └─→ Supabase-Tabellen befüllt
    │
    └─→ Air-Gap-Payloads generiert (Payload 0–5)
            │
            └─→ Supabase: export_prompts.content (JSON)
                    │
                    ▼
            Du (Malte) + Claude Code
                    │
                    ├─ Payload 1 → Regelwerk
                    ├─ Payload 0 → CSS + Header
                    ├─ Payload 2 → Struktur + SCORM-Mapping
                    ├─ Payload 3 → Inhalte
                    ├─ Payload 4 → KI-Briefings → Fragmente
                    ├─ Payload 5 → System-Bausteine
                    │
                    └─→ /output/
                         ├── dashboard-minimalist.html
                         ├── dashboard-pragmatiker.html
                         ├── dashboard-ehrgeizig.html
                         ├── dashboard-passioniert.html
                         ├── task-<id>.html  (×Anzahl Lernpakete)
                         ├── tasks-themenfeld-<id>.html
                         ├── projekte-einheit-<id>.html
                         ├── system-<lerntyp>-<baustein_id>.html
                         ├── fragment-<activity_id>.html
                         └── imsmanifest.xml
```

---

## 8. Noch Fragen?

Wenn du an einer Stelle nicht weiterkommst:
- Jeder Payload enthält einen `meta`-Block mit Version, Hash und Zeitstempel
- Die `template_version` zeigt dir, nach welcher Spec der Prompt gebaut wurde
- Die Hashes (`system_context_hash`, `ui_config_hash`) zeigen dir, ob sich
  das Regelwerk geändert hat → bei neuem Hash: Payload 1 neu einlesen