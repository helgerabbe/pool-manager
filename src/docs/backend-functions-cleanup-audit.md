# Backend-Functions Cleanup-Audit

Stand: 2026-05-19

Ziel: Übersicht, welche Backend-Funktionen aktuell genutzt werden, welche behalten werden sollten und welche nach Gegenprüfung gelöscht werden können.

Wichtig: Dieses Dokument ist bewusst nicht-destruktiv. Es löscht keine Funktionen. Es dient als sichere Grundlage für eine spätere, kontrollierte Bereinigung.

---

## 1. Nicht löschen – aktuell aktiv genutzt

### 1.1 Direkt aus Frontend / Hooks / Services aufgerufen

Diese Funktionen werden aktuell aus der App-Oberfläche oder zentralen Hooks genutzt und sollten nicht gelöscht werden:

- `getEinheitenListSecure`
- `getEinheitenMetricsSecure`
- `getWorkspaceEinheitDataSecure`
- `setLernpfadStatus`
- `syncLernpfadMembership`
- `getLernpfadDriftReport`
- `setReleaseStatusSecure`
- `bulkUpsertExportPrompts`
- `updateSchulNomenklaturSecure`
- `updateMBKGlobalPromptSecure`
- `seedMBKGlobalPrompts`
- `createEinheitSecure`
- `updateEinheitSecure`
- `deleteEinheitSecure`
- `publishEinheitSecure`
- `generateBulkAufgabenSecure`
- `generateReplicasSecure`

### 1.2 Durch aktive Automationen genutzt

Diese Funktionen werden nicht zwingend im Frontend aufgerufen, sind aber durch Automationen aktiv:

- `masterAufgabeTouchActivity`
- `lernpaketAggregateGuardian`
- `lockReaper`
- `cleanupOldDrafts`
- `syncStatusTracker`
- `onLernzielCreated`

Hinweis: `cleanupOldDrafts` ist aktiv, hatte zuletzt aber mehrere Fehler in Folge. Empfehlung: nicht löschen, sondern separat prüfen/reparieren oder Automation pausieren.

---

## 2. Behalten – aktuell wichtig für Admin-, Export-, MBK- oder Notfall-Workflows

Diese Funktionen wirken nicht wie klassische Dauerläufer, sind aber fachlich relevant und sollten vorerst behalten werden:

### Export / Veröffentlichung / Lifecycle

- `preflightFinalRelease`
- `startExportRun`
- `confirmExportCompletion`
- `confirmExportPublished`
- `confirmBrianExport`
- `finalizeExportCompletion`
- `exportMoodlePlan`
- `mbkMarkEinheitPublished`
- `mbkToggleExportLock`

### MBK / interne Generatoren

- `mbkGenerateScaffold`
- `mbkGenerateTasks`
- `seedSystemBausteine`

### Locks / Notfall-Administration

- `forceReleaseLockAdmin`
- `forceReleaseTaskLockAdmin`
- `cleanupStalePresence`
- `healLernpaketAggregat`

### Wizard / Struktur / Mitgliedschaften

- `wizardExportData`
- `createEinheitMitDefaults`
- `createLernpaketWithAutoApproval`
- `addEinheitMemberSecure`
- `removeEinheitMemberSecure`
- `saveEinheitStruktur`
- `applyLernpaketWizardProposal`

### Benutzerverwaltung

- `inviteUserSecure`
- `importBenutzer`
- `listAppUsers`
- `listFachlehrkraefte`

---

## 3. Prüfen – möglicherweise genutzt, aber nicht eindeutig aus zentralen Hooks ersichtlich

Diese Funktionen sollten vor einer Löschung noch gezielt gegen Komponenten, Services und seltene Admin-Flows geprüft werden:

### KI-Generatoren / Assistenten

- `analyzeEinheitGrundgeruest`
- `didaktikCoach`
- `extractStudyflixText`
- `generateBrianSegments`
- `generateErwartungshorizont`
- `generateFachlichePersona`
- `generateInspirationProposal`
- `generateLearningObjectives`
- `generateLernpaketAktivitaeten`
- `generateLeseText`
- `generateLueckentext`
- `generateRubricProposal`
- `generateSortingList`
- `generateTaskProposal`
- `generateThemenfeldTaskIdeas`
- `generateTutorPrompt`
- `generateUnitStructure`

### Content-/Status-Operationen

- `approveActivitySecure`
- `approveMasterAufgabe`
- `approvePackageActivities`
- `assignActivityToLernpaket`
- `handleTaskEditAndResetSync`
- `lockProjectTaskSecure`
- `lockTaskSecure`
- `releaseLernpaketLockSecure`
- `releaseLockSecure`
- `releaseStructuralLockSecure`
- `unlockEinheit`
- `updateActivitySecure`
- `updateLernpaketSecure`
- `updateLernpaketWithStatusManagement`
- `updateTaskWithStateTransition`
- `setEinheitFreigabeStatus`

### Listen-/Filter-Endpunkte

- `listActivitiesExcludeTombstones`
- `listLernpaketeExcludeTombstones`

### Lösch-/Tombstone-Flows

- `deleteActivityWithTombstone`
- `deleteActivityWithTombstoneAndCascade`
- `deleteLernpaketWithTombstone`

---

## 4. Wahrscheinliche Löschkandidaten

Diese Funktionen wirken wie abgeschlossene Diagnose-, Reparatur-, Reset-, Migration- oder Legacy-Funktionen.

Empfehlung: Erst löschen, wenn sie nicht mehr in Dokumentation, Admin-UI, Automationen oder manuellen Wartungsabläufen gebraucht werden.

### 4.1 Diagnose / einmalige Bereinigung

- `diagnosticDuplicateUnits`
- `cleanupDuplicateUnits`
- `fixRubricCriteria`
- `fixAktivitaetenMasterSupport`
- `resetAktivitaetenKatalog`
- `resetSandboxData`
- `seedKurzgeschichten`

### 4.2 Abgeschlossene Migrationen / Backfills

- `backfillMasterActivityReleaseStatus`
- `backfillMasterAufgabeIsComplete`
- `backfillSemantischeSektoren`
- `migrateAufgabenTyp`
- `migrateLegacyAufgabenTypen`
- `migrateLernpfadeToInstanceIds`
- `migrateEinheitFreigabeToLifecycle`

### 4.3 Legacy-/Doppelstrukturen

- `deleteEinheit`
- `deleteEinheitWithCascade`
- `releaseLockSimple`
- `validateExportLock`
- `utils/validateExportLock`
- `utils/auditLogger`
- `utils/rateLimiter`
- `utils/occLockUtils`
- `rbacMiddleware`

---

## 5. Empfohlener Cleanup-Ablauf

1. Dieses Dokument als Grundlage nutzen.
2. Zuerst nur die Kandidaten aus Abschnitt 4 löschen.
3. Nach jedem kleinen Löschpaket App testen.
4. Funktionen aus Abschnitt 3 erst löschen, wenn ein zweiter Suchlauf bestätigt, dass sie wirklich nicht mehr aufgerufen werden.
5. Automationen niemals löschen oder ändern, bevor klar ist, welche Funktion dahinter hängt.

---

## 6. Sofortige nächste sinnvolle Maßnahme

Separat prüfen:

- `cleanupOldDrafts` reparieren oder Automation pausieren, weil die Automation aktiv ist, aber zuletzt mehrfach fehlgeschlagen ist.
- `cleanupStalePresence` prüfen: Secret existiert, aber aktuell wurde keine aktive Automation dafür gefunden.