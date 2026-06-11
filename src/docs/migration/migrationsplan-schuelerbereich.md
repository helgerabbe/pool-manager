# Migrationsplan: Schülerbereich → Dual-Plattform (Base44 + Supabase)

> **Status-Legende:** `[ ]` offen · `[x]` erledigt · `[~]` in Arbeit
>
> **Ziel:** Der Schülerbereich (`/lernen/...`) läuft aus demselben Source Code
> wahlweise gegen Base44 (Entwicklung, wie heute) oder gegen Supabase
> (Produktion für ~300 Schüler, eingebettet in Moodle). Der Lehrer-/Autorenbereich
> bleibt dauerhaft auf Base44.
>
> **Architektur-Prinzip:** Alle Schüler-Komponenten sprechen nur noch mit einem
> zentralen Service Layer (`services/schueler/`). Eine Build-Umgebungsvariable
> (`VITE_BACKEND=base44|supabase`) entscheidet, welcher Adapter dahinter arbeitet.
> Standard ist immer Base44 – die heutige App verhält sich unverändert.

---

## Phase 1: Service Layer im Schülerbereich konsequent durchziehen

*Risikoarm, aber umfangreich. Nach jeder Etappe muss der Schülerbereich
unverändert funktionieren. Keine sichtbaren Änderungen für Nutzer.*

### Etappe 1.1: Inventur + Grundgerüst
- [ ] Inventur: alle direkten `base44.`-Aufrufe in Schüler-Dateien auflisten
      (pages/schueler/**, pages/StudentArea, components/schueler/**, hooks/useSchuelerPfad,
      useEinheitZeitTracker, useEinheitAbschluss, components/ui/SpeechInputButton)
- [ ] `services/schueler/SchuelerDataService.js` anlegen (zentrale Fassade)
- [ ] `services/schueler/adapters/base44Adapter.js` anlegen (kapselt heutige Aufrufe 1:1)
- [ ] Plattform-Weiche `services/schueler/backend.js` (liest `VITE_BACKEND`, Default base44)

### Etappe 1.2: Lese-Pfade umstellen (Inhalte)
- [ ] `useSchuelerPfad.js`: Einheit, Systembausteine, Aufgaben, Lernpakete,
      Aktivitätenkatalog über DataService laden
- [ ] `FachSeite`: Fächer, Phasen, Einheiten über DataService
- [ ] `LernlandkarteSeite`: Themenfelder, Lernpakete, Lernziele über DataService
- [ ] `LernpaketDurcharbeiten` / `loadLernpaketAktivitaeten`: Aktivitäten + Master über DataService
- [ ] `ThemenfeldEinfuehrungSeite` + Onboarding-Seiten: Snapshots (`SchuelerInhaltSnapshot`)
      über DataService lesen

### Etappe 1.3: Schreib-Pfade umstellen (Schülerdaten)
- [ ] `markErledigt` / Aktivitäts-Fortschritt (`SchuelerAktivitaetFortschritt`)
- [ ] Einheit-Fortschritt + Lerntyp-Wahl (`SchuelerEinheitFortschritt`, `useEinheitAbschluss`)
- [ ] Lernziel-Ampel (`SchuelerLernzielEinschaetzung`)
- [ ] Zeit-Tracker (`SchuelerEinheitZeitLog`, `useEinheitZeitTracker`)
- [ ] Merkheft-Notizen (`SchuelerEinheitNotiz`, `MerkheftDialog`, `EinheitZeitDialog`)
- [ ] Lerntagebuch (`SchuelerLerntagebuchEintrag`, `Lerntagebuch`, `PoolzeitStart`)

### Etappe 1.4: Auth + Sonderfälle
- [ ] `AuthService` für Schülerbereich: `me()`, `isAuthenticated()` über Adapter
- [ ] KI-/Funktionsaufrufe identifizieren und markieren
      (`getOrCreateThemenfeldEinfuehrung`, `brianLerntypChat`, `empfehleLerntyp`,
      Onboarding-Generatoren, `TranscribeAudio` in SpeechInputButton)
      → Entscheidung pro Fall: Snapshot-only in Supabase-Modus oder später Edge Function
- [ ] Abschluss-Check: kein direkter `base44.`-Import mehr in Schüler-Dateien
      (außer im base44Adapter)

**✋ Checkpoint 1:** Nutzer testet den Schülerbereich auf Base44 – alles muss
sich exakt wie vorher verhalten.

---

## Phase 2: Supabase-Adapter

- [ ] `@supabase/supabase-js` Paket installieren
- [ ] `services/schueler/adapters/supabaseAdapter.js`: Lese-Methoden gegen die
      Tabellen aus `supabase-schema.sql` (einheiten, lernpakete, lernpaket_aktivitaeten,
      master_aufgaben, lernziele, system_bausteine, inhalt_snapshots, …)
- [ ] Schreib-Methoden: einheit_fortschritt, aktivitaet_fortschritt,
      lernziel_einschaetzungen, zeit_logs, einheit_notizen, lerntagebuch_eintraege
      (Upsert-Logik analog zur heutigen App)
- [ ] Supabase-Auth-Adapter (E-Mail/Passwort-Login, Session-Handling)
- [ ] Einfache Login-Maske für den Supabase-Modus (im Base44-Modus unsichtbar)
- [ ] Verhalten im Supabase-Modus für KI-Features definieren:
      Snapshot vorhanden → anzeigen; nicht vorhanden → freundlicher Hinweis

**✋ Checkpoint 2:** Code-Review – beide Adapter implementieren dieselbe Schnittstelle.

---

## Phase 3: Export-Brücke (Base44 → Supabase)

- [ ] Secrets anlegen: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Backend-Funktion `exportEinheitToSupabase`: veröffentlichte Einheit inkl.
      Themenfelder, Lernpakete, Aktivitäten, Master, Lernziele, Aufgaben,
      Systembausteine, Snapshots in die Supabase-Inhaltstabellen schreiben (Upsert)
- [ ] Admin-UI-Knopf im Export-Center: „Nach Supabase exportieren"
- [ ] Voraussetzung dokumentieren: vor Export „Interne Inhalte erzeugen"
      (alle KI-Snapshots generieren), damit der Supabase-Modus vollständig ist

**✋ Checkpoint 3:** Test-Export einer Einheit, Daten im Supabase Table Editor prüfen.

---

## Phase 4: Probelauf auf Supabase

- [ ] GitHub-Sync verifizieren (Repository aktuell?)
- [ ] GitHub Action: Build mit `VITE_BACKEND=supabase` + `VITE_SUPABASE_URL` +
      `VITE_SUPABASE_ANON_KEY` → Deploy auf GitHub Pages
- [ ] Test-Schüler in Supabase anlegen (Authentication → Users)
- [ ] End-to-End-Test: Login → Fach → Einheit → Onboarding → Dashboard →
      Aktivität erledigen → Lernlandkarte → Merkheft → Fortschritt prüfen
- [ ] Gefundene Fehler hier in Base44 fixen → Sync → Re-Deploy → erneut testen

**✋ Checkpoint 4:** Schüler-App läuft vollständig autark auf GitHub Pages + Supabase.

---

## Phase 5: Moodle-Einbettung

- [ ] Moodle: Schüler-App als externes Tool / URL / iFrame einbinden
- [ ] Login-Fluss für Schüler dokumentieren (Supabase-Konten anlegen/einladen)
- [ ] Site URL + Redirect-URLs in Supabase Auth-Konfiguration eintragen
- [ ] Pilotlauf mit kleiner Schülergruppe

---

## Entscheidungs-Log

| Datum | Entscheidung |
|---|---|
| 2026-06-11 | Dual-Plattform-Strategie beschlossen: Autorenbereich bleibt Base44, Schülerbereich läuft per Build-Variable auf beiden Plattformen. |
| 2026-06-11 | Supabase-Projekt angelegt (Region EU), Schema per `supabase-schema.sql` eingespielt (16 Tabellen + RLS). |
| 2026-06-11 | KI-Features im Supabase-Modus zunächst Snapshot-only (keine Live-KI); Edge Functions ggf. später. |