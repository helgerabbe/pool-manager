# MBK – Nächste Schritte (Stand 2026-06-14)

> To-Do-Liste auf Basis von Claudes Feedback zum ersten real gebauten Modul
> (`docs/2026-06-13-bauanleitung-abgleich.md`).
> Strategische Grundentscheidung: Das Portal (Poolzeit-Manager, Lerntagebuch,
> Cockpit) bleibt eine **eigenständige Web-App**. Moodle ist nur Host für die
> SCORM-Pakete pro Einheit. Der Portal-Nachbau (Phase B der Bauanleitung)
> **bleibt erhalten**.

---

## ✅ Abgeschlossen

- [x] **1. Generator prüfen** – `lib/mbkAirGapPayloads.js` ist bereits vollständig: alle sechs Builder sind reine Browser-Funktionen ohne API-Abhängigkeiten. Keine Änderungen nötig.
- [x] **2. Export-Center erweitert** – Neue `AirGapPayloadDownloadCard` in `ExportCenterArbeitsbereich` eingebunden. Ein-Klick-ZIP-Download aller 6 Payloads. Dateien im ZIP: `payloads/0-ui-config.json` bis `payloads/5-systembausteine.json`.

---

## 1. Bauanleitung v2 – Dokument neu schreiben

**Ziel:** `docs/malte-anleitung-mbk.md` komplett überarbeiten. Der neue Entwurf
heißt `docs/malte-anleitung-mbk-v2.md`.

### 1.1 Beibehalten (wie in v1)
- [ ] Payload-Taxonomie 0–6 (`mbk_ui_config`, `mbk_system_context`, `mbk_structure_payload`, `mbk_task_content_payload`, `mbk_micro_payload`, `mbk_systembaustein_payload`)
- [ ] Die 7 Verträge (`scorm_delivery_contract`, `dashboard_gating_engine`, `onboarding_contract`, `master_anzeige_modus_contract`, `update_lifecycle_contract`, `snapshot_priority_contract`, `schueler_arbeitsumgebung_contract`)
- [ ] `scorm_file_mapping` mit Quelle-ID → Dateiname
- [ ] Snapshot-Vorrang-Regel (fertige Snapshots schlagen KI-Briefings)
- [ ] Pro-Einheit-Checkliste (bereinigt, siehe 1.3)

### 1.2 Ersetzen / Neu
- [ ] **Bau-Methode:** Hand-Bau-Sessions ersetzen durch **Generator-Workflow** (`node core/build.mjs kurse/<slug>`). Kapitel "Arbeits-Reihenfolge" und "Claude-Code-Strategie" neu schreiben.
- [ ] **Datenquelle:** Supabase-SQL-Abfragen ersetzen durch **GitHub-Repo als Quelle der Wahrheit** (`kurse/<slug>/payloads/*.json`). Payloads werden als Dateien aus dem Export-Center heruntergeladen und ins Repo eingecheckt.
- [ ] **SCORM-Runtime:** Abschnitt "Base44-Plugins" (`lib/runtime/plugin_*.js`) streichen. Ersetzen durch Verweis auf die eigene Engine `core/assets/mbk-runtime.js` mit 18 Aktivitätstypen.
- [ ] **SCORM-Manifest:** Spezifikation ändern von "viele Items" auf **ein einziger SCO** (`index.html` als Einstieg, interne Navigation über Links).
- [ ] **KI-Aktivitäten:** Fragment-Schritt streichen. Ersetzen durch **Live-KI-Feedback zur Laufzeit** (Make.com-Webhook) + Klarstellung, dass Aufgabentext immer sichtbar ist, `kriterien` nur für die KI.
- [ ] **Datenfluss-Diagramm:** Erweitern um den Lauf: GitHub → Generator → Zip → Supabase-Bucket → Moodle + Fortschritts-/Telemetrie-Rückweg.
- [ ] **Output-Ablage:** Beschreiben als `kurse/<slug>/build/` (generiert, gitignoriert), Kern in `core/`.

### 1.3 Streichen / Korrigieren
- [ ] Manifest-Checklistenpunkt "Dashboards als erste `<item>`-Einträge" → ersetzen durch "ein SCO, `index.html` als Einstieg".
- [ ] Manueller Fragment-Merger-Schritt (Payload 4 → `fragment-*.html` → manuell einweben) → komplett streichen.

---

## ✅ Export-Center – App-Änderungen (erledigt)

**Ziel:** Das Base44-Export-Center so erweitern, dass Payloads als **JSON-Dateien**
heruntergeladen werden können (statt nur in Supabase zu schreiben).

### 2.1 Neuer Download-Button / Tab
- [x] Im `ExportCenterArbeitsbereich` neuen Abschnitt **"Air-Gap-Payloads herunterladen"** hinzugefügt → `AirGapPayloadDownloadCard.jsx`.
- [x] Pro Einheit: Button für ZIP-Download aller 6 Payloads (`mbk-payloads_<slug>.zip`).
- [x] Einzel-Downloads pro Payload-Typ bereits im `MBKAirGapTabsPanel` vorhanden.

### 2.2 Payload-Generierung im Browser
- [x] `lib/mbkAirGapPayloads.js` bereits vollständig – alle Builder sind reine JS-Funktionen ohne DB-Persistenz.
- [x] ZIP-Erzeugung client-seitig mit `JSZip` über `lib/airGapClipboard.js` → `downloadZip()`.

### 2.3 Bestehenden Supabase-Export erhalten
- [x] Der bestehende `exportEinheitToSupabase`-Flow bleibt **unangetastet**. Der neue Download-Weg läuft parallel.

---

## 3. Generator & Engine – Wiederverwendbare Artefakte

**Ziel:** Die von Claude gebauten Kern-Komponenten (`core/build.mjs`, `core/assets/mbk-runtime.js`, `core/assets/design-kit.css`) als "Source of Truth" für alle künftigen Einheiten dokumentieren.

- [ ] In der Bauanleitung v2 den Generator (`core/build.mjs`) als **einzigen Bau-Workflow** beschreiben.
- [ ] Die Engine (`mbk-runtime.js`) mit allen 18 Aktivitätstypen dokumentieren (Typ-Liste aus Claudes Analyse übernehmen).
- [ ] Klarstellen: Diese Artefakte liegen im GitHub-Repo, werden **nicht** von Base44 verwaltet. Base44 liefert nur die Payloads (Eingabe für den Generator).

---

## 4. Antwort-Dokument an Malte

**Ziel:** Transparent machen, was wir übernommen haben, was nicht, und warum.

- [ ] Dokument `docs/malte-antwort-mbk-abgleich.md` erstellen mit:
  - **Danke für das detaillierte Feedback.**
  - **Tabelle: Was wir übernehmen** (Generator, Engine, ein SCO, GitHub als Quelle, Live-KI-Feedback, korrigierter Datenfluss) – mit kurzer Begründung.
  - **Tabelle: Was wir anders entscheiden** (Portal-Nachbau bleibt, weil Ziel = eigenständige Web-App, nicht nur Moodle-Kursbaustein) – mit didaktischer und UX-Begründung.
  - **Hinweis auf Bauanleitung v2** (neues Dokument, das den Generator-Workflow abbildet).
  - **Hinweis auf Export-Center-Update** (Payload-Download als ZIP, direkt ins Repo eincheckbar).
  - **Ausblick:** Nächste Einheit wird nach dem neuen Workflow gebaut.

---

## 5. E-Mail an Malte

**Ziel:** Kompakte, persönliche Zusammenfassung. Maximal 10–12 Sätze.

- [ ] E-Mail-Entwurf (`docs/malte-email-entwurf.md`) mit:
  1. Danke für die gründliche Analyse.
  2. Generator statt Handbau: übernehmen wir (schneller, wiederholbar).
  3. GitHub als Quelle: übernehmen wir (Payloads als Dateien, versionierbar).
  4. Engine statt Base44-Plugins: übernehmen wir (umfassender, SCORM-nativ).
  5. Ein SCO statt viele Items: übernehmen wir (simpel, Moodle-kompatibel).
  6. Live-KI-Feedback: übernehmen wir (besser als statische Fragmente).
  7. Portal-Nachbau (Phase B): bleibt entgegen Claudes Empfehlung, weil das Ziel eine eigenständige App ist, nicht nur ein Moodle-Kurs. Didaktische Begründung: Schüler sollen nicht aus der Anwendung geworfen werden.
  8. Bauanleitung v2 kommt.
  9. Export-Center bekommt Payload-Download.
  10. Bitte um kurze Rückmeldung, ob das für ihn passt.

---

## 6. Reihenfolge der Umsetzung

| # | Schritt | Status |
|---|---------|--------|
| 1 | `lib/mbkAirGapPayloads.js` prüfen/erweitern | ✅ Erledigt |
| 2 | Export-Center: Download-Button + ZIP-Erzeugung | ✅ Erledigt |
| 3 | `docs/malte-anleitung-mbk-v2.md` schreiben | ✅ Erledigt |
| 4 | `docs/malte-antwort-mbk-abgleich.md` schreiben | ✅ Erledigt |
| 5 | `docs/malte-email-entwurf.md` schreiben | ✅ Erledigt |
| 6 | Alles an Malte senden | ⬜ |

---

## 7. Offene Punkte (nicht blockierend)

- [ ] **GitHub-Repo für `core/` und `kurse/`:** Wo genau liegt Claudes Generator-Repo? Brauchen wir ein separates Repo oder lebt das im selben Repo wie die Base44-App?
- [ ] **SCORM-Zip → Supabase-Bucket → Moodle:** Der automatisierte Upload-Pfad (Claudes `deploy.ps1`) – soll der manuell bleiben oder per GitHub Action automatisiert werden?
- [ ] **Make.com-Webhook für Live-KI:** Wo ist der konfiguriert? Brauchen wir dazu Doku oder Zugang?