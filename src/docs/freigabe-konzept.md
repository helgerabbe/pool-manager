# Freigabe-Konzept (Stand 2026-05-14)

Single Source of Truth für die zweistufige Freigabe-Logik in der App.

## Konzept-Kernsätze

1. **Vollständigkeit** = System rechnet automatisch (live).
2. **Freigabe** = Lehrkraft aktiv per Klick, nur möglich wenn vollständig.
3. **Freigabe sperrt** das Objekt komplett für jede Bearbeitung.
4. **Zurücknehmen** kann jede berechtigte Lehrkraft (Fach + Einheit sichtbar).
5. **Hierarchie strikt:**
   - Aktivität freigegeben → Master/Klone gesperrt.
   - Lernpaket nur freigebbar, wenn alle Aktivitäten frei.
   - Einheit nur final, wenn alle Lernpakete + Aufgaben frei.
6. **Bei Bearbeitung nach Zurücknahme:** Freigabe muss aktiv neu gegeben werden (kein Auto).
7. **Cockpit / Fachschaftsleitung:** sieht nur `Freigegeben` / `Nicht freigegeben`.

## Architektur

### Bibliotheken (Single Source of Truth)

- `lib/completenessValidation.js` — `validateActivity()`, `validateMasterAufgabe()`, `validateAllgemeineAufgabe()`, `validateProjektaufgabe()`, `validateLernpaketReleaseReadiness()`
- `lib/releaseLockCheck.js` — `isEinheitLocked()`, `isLernpaketReleased()`, `isActivityReleased()`, `getActivityLockReason()`, `getLernpaketLockReason()`, `canToggleActivityRelease()`, `canToggleLernpaketRelease()`

### Hooks

- `hooks/useCompleteness.js` — Live-Vollständigkeit (Activity, Master, Allgemein, Projekt, Lernpaket-Aggregat)
- `hooks/useReleaseLock.js` — Effektiver Sperrstatus entlang der Hierarchie
- `hooks/useSetReleaseStatus.js` — Wrapper um `setReleaseStatusSecure` mit React-Query-Invalidierung + Toast

### UI-Komponenten

- `components/release/CompletenessIndicator.jsx` — 🟡/✅ Banner über dem Toggle
- `components/release/ReleaseToggleSection.jsx` — Premium-Toggle mit 4 Zuständen
- `components/release/ReleasedLockedBanner.jsx` — Read-Only-Banner oben im Modal
- `components/release/LernpaketReleaseSection.jsx` — Lernpaket-Freigabe-Block
- `components/release/AllgemeineAufgabeReleaseSection.jsx` — Drop-in für AllgemeineAufgabe + Projekt
- `components/release/SidebarLockIcon.jsx` — Mini-🔒 in der Sidebar
- `components/release/SyncStatusBadge.jsx` — Vereinheitlichtes Sync-Badge („Neu" statt „Nicht exportiert")

### Backend

- `functions/setReleaseStatusSecure.js` — **Zentrale** Freigabe-/Rücknahme-Funktion mit Validierung
- `functions/updateActivitySecure.js` — Prüft Freigabe-Sperre vor Edit (423); berechnet `is_complete` ehrlich
- `functions/updateLernpaketSecure.js` — Prüft Freigabe-Sperre vor Edit (423)
- `functions/preflightFinalRelease.js` — Erweitert um `releaseHierarchyOk`, `unreleasedLernpakete`, `unreleasedAufgaben`

### Datenmodell-Ergänzungen

- `LernpaketPhaseAktivitaet`: `released_at`, `released_by`
- `Lernpakete`: `released_at`, `released_by`, Default `content_status='draft'` (statt 'approved')
- `AllgemeineAufgabe`: `released_at`, `released_by`, `is_complete`

## Phasen-Roadmap (komplett umgesetzt)

| Phase | Beschreibung | Status |
|-------|--------------|--------|
| 1 | Validierungs-Bibliothek + Tests | ✅ |
| 2 | Sperr-Check-Bibliothek + Tests | ✅ |
| 3 | Backend: ehrliche `is_complete` + `setReleaseStatusSecure` + Edit-Block | ✅ |
| 4 | Frontend-Hooks | ✅ |
| 5 | UI-Komponenten | ✅ |
| 6 | Pilot: `TextLesenModal` | ✅ |
| 7 | Rollout: `BaseActivityModal` (8 Modals) | ✅ |
| 8 | Lernpaket-Freigabe-Block | ✅ |
| 9 | Allgemeine Aufgaben + Projekte (Bibliothekskomponente) | ✅ |
| 10 | Workspace-Header + `Neu`-Badge + Sidebar-🔒 | ✅ |
| 11 | Einheit-Final-Lock + Preflight-Erweiterung | ✅ |
| 12 | Migration + Doku (vorgesehen für Bestandsdaten) | ⏳ offen |

## Noch offene Wiring-Punkte (nicht-blockierend)

Diese Punkte müssen beim nächsten Sprint von den Aufrufer-Komponenten umgesetzt werden, damit die Freigabe-Sperre **überall** wirkt — die Bibliothek + Hooks sind bereit:

1. **Workspace → BaseActivityModal-Nutzer**: 8 Modal-Stellen (MatchTermsModal, LueckentextWysiwygModal, MultipleChoiceModalDetail, TestModal, MiniQuizModalDetail, SortingListModal, ImageLabelingModalDetail, KITutorModalDetail) müssen die Props `activity`, `catalogEntry`, `parentLernpaket`, `parentEinheit` durchreichen, sonst greift die Sperre nicht (Rückwärtskompat: Modal verhält sich wie bisher).
2. **Workspace → TextLesenModal**: Aufrufer muss die neuen Props `activity`, `parentLernpaket`, `parentEinheit` setzen.
3. **AufgabeCreateView + ProjektCreateView**: `AllgemeineAufgabeReleaseSection` einhängen + Felder bei `aufgabe.content_status==='approved'` read-only schalten.
4. **LernpaketPanel**: Aufrufer kann die `einheit`-Prop durchreichen, damit die Hierarchie-Sperre korrekt evaluiert wird (sonst gilt: Einheit nicht final).
5. **Migration**: Einmalige Migration für Legacy-Lernpakete mit `content_status='approved'`, aber ohne `released_at` — sollten auf `'draft'` korrigiert werden, da unsere Lib diese Pakete bereits korrekt als „nicht freigegeben" interpretiert (sicherer Default).

## Tests

- `lib/__tests__/completenessValidation.test.js` — 25 Tests
- `lib/__tests__/releaseLockCheck.test.js` — 19 Tests

Beide laufen über `vitest`.