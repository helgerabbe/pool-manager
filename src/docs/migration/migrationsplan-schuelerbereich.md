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

### Etappe 1.1: Inventur + Grundgerüst ✅
- [x] Inventur: alle direkten `base44.`-Aufrufe in Schüler-Dateien aufgelistet (siehe Tabelle unten)
- [x] `services/schueler/SchuelerDataService.js` angelegt (zentrale Fassade)
- [x] `services/schueler/adapters/base44Adapter.js` angelegt (kapselt heutige Aufrufe 1:1)
- [x] Plattform-Weiche `services/schueler/backend.js` (liest `VITE_BACKEND`, Default base44)

**Inventur-Ergebnis (direkte `base44.`-Nutzung in Schüler-Dateien):**

| Datei | Nutzt | Etappe |
|---|---|---|
| `hooks/useSchuelerPfad.js` | Einheiten.get, SystemBausteine, AllgemeineAufgabe, Lernpakete, SchuelerAktivitaetFortschritt (CRUD) | 1.2 + 1.3 |
| `hooks/useEinheitZeitTracker.js` | SchuelerEinheitZeitLog (filter/create/update) | 1.3 |
| `hooks/useEinheitAbschluss.js` | SchuelerEinheitFortschritt (filter/update) | 1.3 |
| `pages/StudentArea` | LookupFaecher, Einheiten, SchuelerEinheitFortschritt, SchuelerEinheitZeitLog, SchuelerLerntagebuchEintrag | 1.2 + 1.3 |
| `pages/schueler/FachSeite` | LookupFaecher, LookupPhasen, Einheiten, SchuelerEinheitFortschritt, ZeitLog, Notizen | 1.2 + 1.3 |
| `pages/schueler/Lerntagebuch` | SchuelerLerntagebuchEintrag (filter/create/delete) | 1.3 |
| `pages/schueler/EinheitOnboarding` | Einheiten.get, SchuelerEinheitFortschritt (CRUD) | 1.2 + 1.3 |
| `pages/schueler/EinheitOnboardingQuiz` | Einheiten.get, SchuelerEinheitFortschritt (CRUD), lib/onboardingSnapshots | 1.2 + 1.3 |
| `pages/schueler/PoolzeitStart` | SchuelerLerntagebuchEintrag (bulkCreate) | 1.3 |
| `components/schueler/pfad/LernlandkarteSeite` | Themenfeld, Lernpakete, Lernziele, SchuelerLernzielEinschaetzung (CRUD) | 1.2 + 1.3 |
| `components/schueler/pfad/ThemenfeldEinfuehrungSeite` | SchuelerInhaltSnapshot, functions.invoke(getOrCreateThemenfeldEinfuehrung) | 1.2 + 1.4 |
| `components/schueler/MerkheftDialog` | SchuelerEinheitNotiz (filter/create/delete) | 1.3 |
| `components/schueler/EinheitZeitDialog` | (prüfen in 1.3) | 1.3 |
| `components/ui/SpeechInputButton` | integrations UploadFile + TranscribeAudio | 1.4 |
| `components/schueler/onboarding/StepBrianChat` / `StepEmpfehlung` | functions (brianLerntypChat, empfehleLerntyp) | 1.4 |
| `lib/onboardingSnapshots.js` | SchuelerInhaltSnapshot (prüfen) | 1.2 |

Bereits gut vorbereitet: `services/AuthService.js` (Auth gekapselt) und
`services/AktivitaetService.js` (Aktivitäten gekapselt) – der base44Adapter
delegiert an diese.

### Etappe 1.2: Lese-Pfade umstellen (Inhalte) ✅
- [x] `useSchuelerPfad.js`: Einheit, Systembausteine, Aufgaben, Lernpakete,
      Aktivitätenkatalog über DataService laden
- [x] `FachSeite` + `StudentArea` + `PoolzeitStart`: Fächer, Phasen, Einheiten über DataService
- [x] `LernlandkarteSeite`: Themenfelder, Lernpakete, Lernziele über DataService
- [x] `loadLernpaketAktivitaeten`: Aktivitäten + Master über DataService
- [x] `ThemenfeldEinfuehrungSeite` + `lib/onboardingSnapshots.js` (Lesepfad):
      Snapshots (`SchuelerInhaltSnapshot`) über DataService lesen

### Etappe 1.3: Schreib-Pfade umstellen (Schülerdaten) ✅
- [x] `markErledigt` / Aktivitäts-Fortschritt (`SchuelerAktivitaetFortschritt`)
- [x] Einheit-Fortschritt + Lerntyp-Wahl (`SchuelerEinheitFortschritt`,
      `useEinheitAbschluss`, `EinheitOnboarding`, `EinheitOnboardingQuiz`)
- [x] Lernziel-Ampel (`SchuelerLernzielEinschaetzung`)
- [x] Zeit-Tracker (`SchuelerEinheitZeitLog`, `useEinheitZeitTracker`)
- [x] Merkheft-Notizen (`SchuelerEinheitNotiz`, `MerkheftDialog`;
      `EinheitZeitDialog` geprüft: reine Anzeige, keine Datenzugriffe)
- [x] Lerntagebuch (`SchuelerLerntagebuchEintrag`, `Lerntagebuch`, `PoolzeitStart`,
      `StepWechselNotiz`)

### Etappe 1.4: Auth + Sonderfälle ✅
- [x] Auth im Schülerbereich: `getCurrentUser()` läuft über den DataService
      (delegiert an AuthService)
- [x] KI-/Funktionsaufrufe über `invokeFunction()` im DataService gekapselt
      (`getOrCreateThemenfeldEinfuehrung`, `brianLerntypChat`, `empfehleLerntyp`)
      → im Supabase-Modus: Snapshot-only bzw. freundlicher Hinweis (Phase 2)
- [x] `SpeechInputButton`: `uploadFile()` + `transcribeAudio()` über DataService
- [x] Abschluss-Check: kein direkter `base44.`-Import mehr in Schüler-Dateien
      (geprüft inkl. `components/schueler/lesen/*` – KITutor/KICheck sind reine
      Brian-Links ohne Datenzugriff). Ausnahme bewusst: Schreibpfad in
      `lib/onboardingSnapshots.js` (Lehrer-Tool)

**✋ Checkpoint 1:** Nutzer testet den Schülerbereich auf Base44 – alles muss
sich exakt wie vorher verhalten.

---

## Phase 2: Supabase-Adapter

- [x] `@supabase/supabase-js` Paket installiert
- [x] `services/schueler/adapters/supabaseClient.js`: Singleton-Client
      (liest `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` zur Build-Zeit)
- [x] `services/schueler/adapters/supabaseAdapter.js`: Lese-Methoden gegen die
      Tabellen aus `supabase-schema.sql` (einheiten, lernpakete, lernpaket_aktivitaeten
      inkl. MasterAufgaben-Anreicherung, lernziele, system_bausteine, inhalt_snapshots, …).
      `daten`-jsonb wird mit den Kern-Spalten zur Base44-Form gemergt.
      Fächer werden aus den exportierten Einheiten abgeleitet (keine Lookup-Tabelle).
- [x] Schreib-Methoden: einheit_fortschritt, aktivitaet_fortschritt,
      lernziel_einschaetzungen, zeit_logs, einheit_notizen, lerntagebuch_eintraege
      (`user_email` wird entfernt – `user_id` setzt die DB via auth.uid();
      `created_at` wird als `created_date` gespiegelt)
- [x] Adapter in der Plattform-Weiche registriert (`SchuelerDataService.js`)
- [x] Verhalten im Supabase-Modus für KI-Features definiert:
      `invokeFunction`/`uploadFile`/`transcribeAudio` werfen einen freundlichen
      Hinweis; Inhalte kommen ausschließlich aus `inhalt_snapshots`
- [x] Supabase-Auth: `getCurrentUser()` im Adapter; Login-Fluss + Session-Handling
      über `SupabaseLoginGate` (Session-Check + onAuthStateChange)
- [x] Login-Maske für den Supabase-Modus (`components/schueler/auth/SupabaseLoginForm`);
      die `/lernen`-Routen sind in App.jsx durch das Gate gewrappt –
      im Base44-Modus rendert es transparent durch (Client wird nie geladen)

**✋ Checkpoint 2:** Code-Review – beide Adapter implementieren dieselbe Schnittstelle.

---

## Phase 3: Export-Brücke (Base44 → Supabase)

- [x] Secrets angelegt: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] Backend-Funktion `exportEinheitToSupabase`: Einheit upserten, Kind-Daten
      löschen (FK-Cascade) und frisch einfügen – Themenfelder, Lernpakete,
      Aktivitäten (ohne Tombstones), Master, Lernziele, Aufgaben, Snapshots;
      Katalog + Systembausteine als globale Upserts. Berechtigung: Base44-Admin
      oder App-Rolle Administrator/Fachschaftsleitung/Moodle-Designer.
- [x] UI-Karte im Export-Center: „Nach Supabase exportieren"
      (`components/exportcenter/SupabaseExportCard`, im Arbeitsbereich eingebunden)
- [x] Voraussetzung dokumentiert (in der Karte sichtbar): vor Export
      „Interne Inhalte erzeugen", damit alle KI-Snapshots vorliegen

**✋ Checkpoint 3:** ✅ Test-Export erfolgreich (Einheit „Einführung in die
Poolzeit": 1 Themenfeld, 4 Lernpakete, 18 Aktivitäten, 6 Master, 4 Lernziele,
3 Aufgaben, 1 Snapshot, 15 Katalog-Einträge, 11 Systembausteine).
→ Optional: Daten im Supabase Table Editor gegenprüfen.

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