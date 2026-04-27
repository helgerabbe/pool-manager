# Optimistic Locking auf der `Einheiten`-Entity (Versionierungs-Logbuch)

**Ticket-Nachtrag zu:** Dashboard-Locking / `acquireDashboardLockSecure`
**Status:** Phase 1 abgeschlossen (App-Level-Inkrement), Phase 2 offen (DB-Trigger nach Supabase-Migration)
**Letzte Aktualisierung:** 2026-04-26

---

## 1. Hintergrund

Mit der Einführung von `acquireDashboardLockSecure` nutzt das System
erstmals das Feld `Einheiten.version` als **Optimistic-Concurrency-Control-Signal**
(OCC). Der Lock-Flow dort ist:

1. **READ** der Einheit + `version`.
2. **WRITE** `structural_lock = user.email`, `structural_locked_at = now`,
   `version = currentVersion + 1`.
3. **RE-READ** der Einheit (über `asServiceRole`, kein End-User-Cache).
4. **VERIFY**: `verify.structural_lock === user.email` → Erfolg.
   Andere E-Mail → 409 `race_lost`.

Der Re-Read prüft **ausschließlich die E-Mail** im Lock-Feld – nicht das
Versions-Inkrement. Grund: Solange andere Schreibpfade auf `Einheiten`
das Feld ignorieren oder zurücksetzen, wäre ein Versions-Vergleich
nicht verlässlich. Der Bump dient hier nur als zusätzliches
Forensik-Signal und Stütze für zukünftige Erweiterungen.

---

## 2. Arbeitspaket "Versionierung systemweit nachziehen"

Damit der OCC-Mechanismus systemweit greift, **muss jeder Schreibzugriff
auf die `Einheiten`-Tabelle das `version`-Feld inkrementieren** (bzw.
mindestens unverändert durchreichen). Andernfalls würde ein paralleles
"stilles Update" den Lock-Bump zurücksetzen und der Re-Read könnte
in pathologischen Race-Szenarios falsche Ergebnisse liefern.

### Inkrement-Pattern (kanonisch)

```js
const current = Number.isFinite(einheit?.version) ? einheit.version : 1;
await base44.entities.Einheiten.update(einheit_id, {
  ...updateData,
  version: current + 1,
});
```

Defensive Defaultwerte (`?? 1`) decken historische Records ab, bei denen
`version` noch nie gesetzt wurde.

---

## 3. Audit der Schreibzugriffe (Stand 2026-04-26)

| # | Function | Schreibt auf `Einheiten`? | `version`-Inkrement | Hinweis |
|---|---|---|---|---|
| 1 | `acquireDashboardLockSecure` | ✅ | ✅ (originär) | First-Mover des OCC-Felds |
| 2 | `updateEinheitSecure` | ✅ | ✅ (Phase 6.4) | + Versions-Validierung (409 bei Konflikt) |
| 3 | `saveEinheitStruktur` | ✅ (separater Bump-Update) | ✅ (neu) | Schreibt zusätzlich Themenfelder/Lernpakete |
| 4 | `publishEinheitSecure` | ✅ | ✅ (neu) | Status-Transition |
| 5 | `releaseStructuralLockSecure` | ✅ | ✅ (neu) | Lock-Release |
| 6 | `lockEinheit` | ✅ | ✅ (neu) | Legacy-Lock-Pfad (Tab 2) |
| 7 | `unlockEinheit` | ✅ | ✅ (neu) | Legacy-Lock-Release |
| 8 | `forceReleaseLockAdmin` | ✅ (nur wenn `entityName === 'Einheiten'`) | ✅ (neu, bedingt) | Admin-Override |
| 9 | `createEinheitSecure` / `createEinheitMitDefaults` | ✅ (CREATE) | n/a | Default `version=1` aus Schema |
| 10 | `deleteEinheitSecure` / `deleteEinheitWithCascade` | DELETE | n/a | Kein OCC nötig |

### Nicht betroffen (geprüft)

- `setLernpfadStatus` – schreibt nur auf `LernpfadAufgabeMembership`.
- `cleanupDuplicateUnits`, `lockReaper`, `cleanupOldDrafts` – Wartungs-
  jobs, dürfen optional auch ohne Bump arbeiten (Folge-Ticket falls nötig).

---

## 4. Definition of Done

- [x] Alle in §3 markierten Schreibpfade inkrementieren `version`.
- [x] `acquireDashboardLockSecure` dokumentiert die First-Mover-Disziplin
      ("nur E-Mail entscheidet, nicht das Inkrement").
- [x] Migrations-Logbuch (dieses Dokument) angelegt.
- [ ] **Test (manuell oder e2e):**
      Zwei parallele Sessions –
      Session A öffnet Tab 7 und ruft `acquireDashboardLockSecure` auf,
      Session B feuert zeitgleich ein `updateEinheitSecure` (Stammdaten).
      Erwartet: Beide Operationen sehen einen *konsistent inkrementierten*
      `version`-Wert; B bekommt im 409-Pfad die korrekte aktualisierte
      Version zurückgemeldet, A behält den Lock.

---

## 4b. Zentrale OCC-Hilfsfunktion (2026-04-26)

Um Code-Duplikate zu vermeiden, wurde der Read-Bump-ReRead-Verify-Pass
in eine zentrale Hilfsfunktion ausgelagert:

**Datei:** `functions/utils/occLockUtils.js`
**Export:** `acquireLockWithVersion(base44, config)`

Konfiguration:
```js
{
  entityName,    // "Lernpakete" | "Einheiten" | …
  entityId,      // UUID
  lockField,     // "locked_by_email" | "structural_lock"
  timeField,     // "locked_at" | "structural_locked_at"
  userEmail,     // user.email
  timeoutMs,     // 30 Min / 60 Min …
  extraUpdate?,  // optional zusätzliche Felder fürs Update
                 // (z.B. is_locked: true bei Lernpaketen)
}
```

Rückgabe: `{ ok: true, version, lockedAt }` oder
`{ ok: false, reason: 'busy' | 'race_lost' | 'not_found', lockedByEmail, lockedAt }`.

### Deployment-Constraint („NO LOCAL IMPORTS")

Backend-Functions auf Base44/Deno-Deploy dürfen aktuell nicht aus anderen
Dateien im `functions/`-Ordner importieren. Deshalb wird
`acquireLockWithVersion` in jede konsumierende Function **inline kopiert**.
`occLockUtils.js` selbst hat einen Deno.serve-Stub mit `410 Gone`, damit
sie deploybar bleibt, aber nicht versehentlich aufgerufen wird.

**Single Source of Truth:** `functions/utils/occLockUtils.js`
**Inline-Kopien:**
- `functions/acquireUnitLockSecure` (Einheiten / structural_lock; ersetzt
  seit 2026-04-26 die früheren `acquireStructuralLockSecure` und
  `acquireDashboardLockSecure` – beide Endpunkte wurden gelöscht).
- `functions/acquireLockSecure` (Lernpakete / locked_by_email)

**Regel:** Wer den Wrapper ändert, muss den Code-Block in ALLEN
Inline-Kopien synchron mitziehen (Suche nach `acquireLockWithVersion`).

Nach der Supabase-Migration entfällt die Verdopplung – siehe §5.

## 5. Migrations-Pfad nach Supabase

Das App-Level-Inkrement ist ein **Übergangs-Konstrukt**. Sobald die
Migration auf Supabase / Postgres erfolgt, wird die Logik in die
Datenbank verschoben:

```sql
-- Phase 2: BEFORE-UPDATE-Trigger auf einheiten
CREATE OR REPLACE FUNCTION bump_einheiten_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version := COALESCE(OLD.version, 1) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bump_einheiten_version
BEFORE UPDATE ON einheiten
FOR EACH ROW EXECUTE FUNCTION bump_einheiten_version();
```

**Vorteile:**
- Garantiert atomar (auch bei direkten DB-Zugriffen, Backfills, SQL-Konsolen).
- Entfernt Boilerplate aus jedem App-Code-Pfad.
- Lässt sich später um Konflikt-Erkennung im Trigger erweitern
  (z. B. Reject bei `OLD.version <> NEW.version`).

**Migrations-Schritt:**
1. Trigger anlegen.
2. App-Code: alle `version: current + 1`-Zeilen entfernen (Cleanup-PR).
3. `acquireUnitLockSecure`: First-Mover-Kommentar entfernen,
   Re-Read kann dann optional auf `verify.version > currentVersion`
   prüfen (zusätzliche Sicherheit).

---

## 6. Bekannte offene Punkte (Folge-Tickets)

- **End-to-End-Test** für die Race-Condition (siehe DoD-Checkbox oben).
- **Frontend-Resync**: Komponenten, die `einheit.version` lokal halten
  (v. a. `EinheitFormWithValidation`), sollten nach Server-Antworten
  den neuen Versions-Wert übernehmen, um unnötige 409-Konflikte beim
  nächsten Save zu vermeiden.
- **Lernpakete**: ✅ `version`-Feld ergänzt (2026-04-26). Erster
  Schreibpfad mit OCC: `acquireLockSecure`. Folgepfade, die noch ohne
  Bump arbeiten und nachgezogen werden müssen:
  - `releaseLernpaketLockSecure`, `releaseLockSecure`, `releaseLockSimple`,
    `acquireLockSimple` (Lock-Lifecycle)
  - `updateLernpaketSecure`, `updateLernpaketWithStatusManagement`,
    `createLernpaketWithAutoApproval`
  - `deleteLernpaketWithTombstone`, `forceReleaseLockAdmin` (Lernpakete-Branch)
  - `saveEinheitStruktur` (Lernpaket-Updates innerhalb der Struktur)
  Bis diese mitziehen, ist auch hier nur das Lock-vs-Lock-Rennen in
  `acquireLockSecure` selbst abgesichert (E-Mail im Re-Read = Wahrheit).
- **Aufgabenbausteine**: aktuell ohne `version`-Feld. Falls dort später
  ähnliche Race-Conditions auftreten, separates Schema- + Function-Ticket
  aufmachen.

---

## 7. RBAC-Hardening Begleitnotiz (2026-04-26)

Beim OCC-Rollout in `acquireLockSecure` wurde zusätzlich die
Fachschafts-Berechtigung enger gefasst, um die dokumentierte
RBAC-Matrix (`BACKEND_SECURITY_ARCHITECTURE.md` §1.2:
Fachschaftsleitung → `mustOwnSubject: true`) tatsächlich abzubilden:

**Vorher (zu lasch):**
```
if (!istFachschaft && !fachzustaendig) { /* deny */ }
// → Fachschaftsleitung durfte ALLE Pakete sperren, fachunabhängig.
```

**Nachher (RBAC-konform):**
```
const istFachschaftFuerFach = rolle === 'Fachschaftsleitung' && fachzustaendig;
if (!istFachschaftFuerFach && !fachzustaendig) { /* fallback: EinheitMembers */ }
```

Bitte beim nächsten RBAC-Sweep prüfen, ob andere Funktionen
(`updateLernpaketSecure`, `lockTaskSecure`, …) dasselbe lasche Pattern
nutzen und ebenfalls verschärft werden müssen.

---

## 8. Unified Unit Lock (2026-04-26)

Die bisherigen Endpunkte `acquireStructuralLockSecure` (Tab 2) und
`acquireDashboardLockSecure` (Tab 7) wurden zu **einem** kugelsicheren
Endpunkt zusammengeführt: `functions/acquireUnitLockSecure`.

Eingangs-Parameter:
```
{ einheit_id, scope: 'structure' | 'dashboard' }
```

Beide Scopes laufen durch dieselbe RBAC-Prüfung (`checkUnifiedPermission`)
und denselben OCC-Wrapper (`acquireLockWithVersion`). Der Unterschied
liegt ausschließlich in **Phase 2 (Deep Scan)**: `dashboard` prüft
zusätzlich aktive Lernpaket- und AllgemeineAufgabe-Locks innerhalb der
Einheit, bevor der Struktur-Lock gesetzt wird.

### Frontend-Migration

`pages/Workspace` ruft seit 2026-04-26 ausschließlich
`acquireUnitLockSecure` auf:
- Tab 1 + Tab 2 (`handleAcquireStructLock`, `handleAcquireTab1Lock`) →
  `scope: 'structure'`
- Tab 7 (`handleAcquireDashboardLock`) → `scope: 'dashboard'`

Die alten Endpunkte sind aus dem Repository entfernt – es gibt keine
„Geister-Endpunkte" im Backend mehr.

### Phase-2b-Workaround (Aufgaben-Filter)

In Phase 2b (Tiefen-Scan auf `AllgemeineAufgabe`) versucht der Code
zuerst eine `$ne: null`-Query auf das Feld `locked_by`. Schlägt das
fehl (Limitierung des Base44-SDKs auf bestimmten Operatoren), fällt
er auf einen JS-seitigen Filter zurück:

```js
aktiveAufgaben = await base44.asServiceRole.entities.AllgemeineAufgabe.filter({ einheit_id });
aktiveAufgaben = (aktiveAufgaben || []).filter((a) => !!a.locked_by);
```

Bewusst akzeptiertes Risiko: Bei sehr großen Einheiten lädt der
Fallback **alle** Aufgaben einer Einheit in den Speicher.

### @MIGRATION_NOTE (Supabase) – Phase 2b

Bei der Migration zu Supabase MUSS dieser Fallback durch eine
performante Datenbank-Abfrage ersetzt werden, um Out-of-Memory-
Risiken bei großen Einheiten zu vermeiden. Empfehlung:

```sql
-- Statt "alle Aufgaben laden + JS-filter":
SELECT 1
FROM allgemeine_aufgabe
WHERE einheit_id = $1
  AND locked_by IS NOT NULL
  AND locked_by <> $2
  AND locked_at > NOW() - INTERVAL '60 minutes'
LIMIT 1;
```

Oder als `EXISTS`-Klausel im Lock-RPC. Sobald Supabase aktiv ist,
fällt sowohl der `$ne: null`-Versuch als auch die JS-Filter-Schleife
weg; der Lock-Pfad bleibt damit auch bei mehreren tausend Aufgaben
pro Einheit konstant in der Laufzeit.

---

## 9. RBAC-Hardening: addEinheitMemberSecure (2026-04-26)

Beim Code-Review von `functions/addEinheitMemberSecure` wurden vier
Themen adressiert, die für die Supabase-Migration relevant bleiben:

1. **Rate-Limiter:** Eigenbau ersetzt durch Inline-Kopie aus
   `functions/utils/rateLimiter.js` (gleiche „NO LOCAL IMPORTS"-Regel
   wie bei `occLockUtils.js`). Beim Wechsel auf Redis (Upstash) muss
   nur die zentrale Datei umgestellt werden – jede Inline-Kopie
   trägt einen `@MIGRATION_BLOCKER`-Hinweis.

2. **Datenmodell-Konsistenz (User vs. Benutzer):** Ziel-User wird
   primär über `Benutzer.user_id` aufgelöst (konsistent zum Rest des
   Skripts, sauberer Display-Name aus `vorname`/`nachname`). Die
   eingebaute `User`-Auth-Tabelle bleibt nur als Fallback, um den
   `full_name` zu erhalten, falls kein `Benutzer`-Profil existiert.

3. **RBAC: lokale LEITUNG überstimmt globale Rolle.** Vorher durfte
   nur eine `Fachlehrkraft` mit delegierter LEITUNG einladen – das
   schloss Vertretungs-/Referendars-Konstellationen mit globaler Rolle
   `Betrachter` aus. Neu: jede globale Rolle, die für genau diese
   Einheit als LEITUNG eingetragen ist, darf einladen.

4. **Anti-Privilege-Escalation:** Eine delegierte Unit-LEITUNG darf
   ausschließlich `EDITOR` und `READER` einladen, KEINE weiteren
   `LEITUNG`-Rollen. Damit kann sich eine einzelne ernannte LEITUNG
   nicht beliebig viele Co-Owner installieren. `Administrator` und
   `Fachschaftsleitung` (im eigenen Fach) bleiben unbeschränkt.

### @MIGRATION_NOTE (Supabase) – RBAC-Endspiel

Die heutige 3-Tabellen-Rechteprüfung (User-Auth → `Benutzer` →
`EinheitMembers`) wird durch Postgres-RLS auf `EinheitMembers`
abgelöst. Die Funktion selbst schrumpft auf einen einzigen
`INSERT … ON CONFLICT … DO UPDATE`, der durch RLS-Policies abgesichert
ist. Audit-Logging wandert in einen `AFTER INSERT`-Trigger.

---

## 10. Konsolidierung der Backend-Utilities: Rate-Limiter (2026-04-26)

**Status Quo.** Die Sliding-Window-Logik liegt zentral in
`functions/utils/rateLimiter.js`. Konsumierende Functions importieren
sie nicht direkt (Deno-Deploy-Constraint „NO LOCAL IMPORTS" – siehe §4b),
sondern halten eine **Inline-Kopie** des Limiters; jede Kopie trägt den
Header-Kommentar `@MIGRATION_BLOCKER: IN-MEMORY STATE`.

**Aktuelle Inline-Kopien:**
- `functions/addEinheitMemberSecure`

**Herausforderung.** Eine prozess-lokale `Map` ist auf Edge-Functions
nicht verlässlich:
- Cold-Starts setzen den Speicher zurück → Limit wirkungslos.
- Mehrere Isolates pro Region → jeder Worker hat seine eigene Map,
  ein Angreifer kann Limits durch Sticky-Session-Bypass umgehen.

**Lösung nach Migration (Supabase / Edge-Functions):**
1. `functions/utils/rateLimiter.js` wird auf einen externen
   Redis-Provider umgestellt (Upstash oder Supabase-eigener KV-Store).
   Sliding-Window per `INCR` + `EXPIRE` oder `ZADD` + `ZREMRANGEBYSCORE`.
2. Sobald lokale Imports zwischen Functions möglich sind (Supabase
   Edge Runtime erlaubt das), entfallen alle Inline-Kopien – jede
   Function importiert nur noch `isRateLimited` aus der Utility.
3. Damit muss bei Tarif-/Limit-Änderungen nur **eine** Datei angefasst
   werden; das gesamte System ist konsistent abgesichert.

**Definition of Done für die Migration.**
- [ ] `rateLimiter.js` nutzt Redis statt `Map` (Upstash-Client).
- [ ] Alle Inline-Kopien aus den Functions entfernt.
- [ ] `@MIGRATION_BLOCKER`-Suche im Repo findet keine Treffer mehr
      für den Rate-Limiter.

---

## 11. approveMasterAufgabe – RBAC, sync_status, Race Condition (2026-04-26)

Beim Code-Review von `functions/approveMasterAufgabe` wurden vier
Themen adressiert:

1. **sync_status beim Approve.** Header und Implementierung lagen
   auseinander – jetzt setzt `action === 'approve'` zusätzlich
   `sync_status = 'pending'`, damit die Moodle-Pipeline den Master
   als „neu zu exportieren" erkennt. Beim `unapprove` bleibt der
   bisherige `sync_status` bewusst unangetastet.

2. **RBAC-Lücke (Admin-Aussperrer).** Die alte Implementierung prüfte
   ausschließlich `EinheitMembers` – globale Admins und zuständige
   Fachschaftsleitungen konnten kein Approval setzen, wenn sie nicht
   explizit Mitglied der Einheit waren. Behoben durch
   `checkApprovalPermission`, die exakt der Logik aus
   `acquireUnitLockSecure.checkUnifiedPermission` folgt:
   - Administrator (global oder via Benutzer.rolle) → frei
   - Fachschaftsleitung MIT Fachzuständigkeit       → frei
   - Sonst: jede Mitgliedschaft in `EinheitMembers` → frei

3. **Lock-Philosophie (bewusst behalten).** Schritt 4 prüft NUR
   gegen FREMDE Locks. Eigenes Schreiben ohne aktiven Lock bleibt
   erlaubt – das matcht die Restarchitektur (Approval ist ein
   Status-Switch, kein Inhalts-Edit). Eigene Race-Conditions werden
   durch die `version`-OCC-Felder der eigentlichen Lock-Endpunkte
   (`acquireLockSecure`, `acquireUnitLockSecure`) abgesichert; eine
   zusätzliche OCC-Spalte auf `MasterAufgabe` lohnt sich erst, wenn
   dort eigene Concurrent-Edits möglich werden.

4. **Race Condition im Activity-Aggregat (Schritt 7) – akzeptiert.**
   Wenn zwei Lehrkräfte exakt gleichzeitig zwei verschiedene Masters
   derselben Activity approven, lesen beide den jeweils alten
   Aggregat-Zustand. Ohne native Transaktionen im Base44-SDK ist
   das nur durch ein DB-seitiges Aggregat sauber lösbar.

### @MIGRATION_NOTE (Supabase) – Aggregat per Trigger

Bei der Supabase-Migration wandern die Schritte 4–7 dieses Skripts
komplett aus dem JavaScript heraus:

```sql
-- 1. RLS auf MasterAufgabe regelt, wer überhaupt updaten darf.
-- 2. AFTER UPDATE-Trigger auf MasterAufgabe synchronisiert das
--    Aggregat in LernpaketPhaseAktivitaet atomar – ohne
--    Read-Modify-Write-Race im Application-Code.

CREATE OR REPLACE FUNCTION sync_activity_content_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE lernpaket_phase_aktivitaet a
     SET content_status = CASE
       WHEN NOT EXISTS (
         SELECT 1 FROM master_aufgabe m
         WHERE m.activity_id = a.id
           AND m.content_status <> 'approved'
       ) THEN 'approved'
       ELSE 'draft'
     END
   WHERE a.id = NEW.activity_id;
  RETURN NEW;
END $$;

CREATE TRIGGER master_aufgabe_aggregate
AFTER UPDATE OF content_status ON master_aufgabe
FOR EACH ROW EXECUTE FUNCTION sync_activity_content_status();
```

Damit läuft das Aggregat exakt einmal pro Master-Update und ist
durch die DB-interne Sperre serialisiert – keine Race Condition mehr.

### @MIGRATION_NOTE (Supabase) – Validierungs-Wasserfall via RLS

Die heutige Read-Kette
`MasterAufgabe → Activity → Lernpakete → Einheiten → EinheitMembers/Benutzer`
(5 sequenzielle Roundtrips, jeweils mit Netzwerklatenz) entfällt
vollständig. Stattdessen prüft eine RLS-Policy auf `master_aufgabe`
direkt in der DB (auth.uid() + JOINs auf Einheiten/EinheitMembers/
Benutzer). Die Function schrumpft auf einen einzigen
`UPDATE master_aufgabe SET … WHERE id = $1`. Erwartete Latenz:
~5–15 ms statt ~150–300 ms heute.

---

## 12. approvePackageActivities – Bulk-Approve hardening (2026-04-26)

Beim Code-Review von `functions/approvePackageActivities` wurden vier
Blocker behoben:

1. **Fehlendes RBAC.** Der alte Code prüfte nur `auth.me()` – jeder
   eingeloggte User konnte fremde Lernpakete zwangs-freigeben. Neu:
   `checkApprovalPermission` (identisch zu `approveMasterAufgabe`
   und `acquireUnitLockSecure`) lädt Lernpaket → Einheit und prüft
   Admin / Fachschaft-mit-Fach / EinheitMembers.

2. **Lock-Architektur respektieren.** Hält ein anderer User einen
   nicht-stale Lernpaket-Lock, schlägt der Bulk-Approve mit 403 fehl.
   Eigener Lock oder fehlender Lock bleiben erlaubt – Approve ist
   ein Status-Switch, kein Inhalts-Edit (Lock-Philosophie aus §11).

3. **N+1-Update-Schleife.** `for…await` ersetzt durch
   `Promise.allSettled([...activityUpdates, ...masterUpdates])`.
   Damit bricht der Endpunkt auf Edge-Functions auch bei 30+
   Activities nicht mehr im Timeout zusammen. Fehlgeschlagene
   Updates werden geloggt und als `partial: true` an den Client
   zurückgegeben statt verschluckt.

4. **Master-Konsistenz.** Sobald eine Activity (force-)approved
   wird, ziehen alle ihre `MasterAufgabe`-Kinder mit:
   `content_status='approved'`, `sync_status='pending'`. Klone
   (`is_master === false`) bleiben unangetastet. Das deckt sich mit
   dem Aggregat-Modell aus §11 und verhindert den Geister-Zustand
   "Activity grün, Masters rot".

### @MIGRATION_NOTE (Supabase) – Bulk per SQL

Bei der Supabase-Migration entfällt die JS-Schleife komplett:

```sql
-- 1) Activities setzen
UPDATE lernpaket_phase_aktivitaet
   SET content_status = 'approved',
       is_complete    = TRUE  -- nur bei force; sonst weglassen
 WHERE lernpaket_id = $1;

-- 2) Master-Konsistenz: über JOIN, nicht 30 Einzel-Calls
UPDATE master_aufgabe m
   SET content_status = 'approved',
       sync_status    = 'pending'
  FROM lernpaket_phase_aktivitaet a
 WHERE m.activity_id = a.id
   AND a.lernpaket_id = $1
   AND m.is_master IS NOT FALSE;
```

Der `AktivitaetenKatalog`-Lookup für Platzhalter-Defaults wird zum
LEFT JOIN, oder – noch besser – zur DB-seitigen DEFAULT-Funktion,
sobald die `force`-Felder als generated columns abgebildet sind.

### Definition of Done für die Migration

- [ ] Function deletet, ersetzt durch RPC oder direkt durch
      `UPDATE … WHERE …`.
- [ ] RLS-Policy auf `lernpaket_phase_aktivitaet` deckt die
      Approval-Berechtigung ab (Admin / Fachschaft / EinheitMembers).
- [ ] Master-Aggregat-Trigger aus §11 ist aktiv – damit greift die
      Master-Synchronisation auch automatisch für diesen Pfad.

---

## 13. assignActivityToLernpaket – Tenant-Isolation + FK-Härtung (2026-04-26)

Beim Code-Review von `functions/assignActivityToLernpaket` wurden vier
Blocker behoben:

1. **Fehlendes RBAC.** Der alte Code prüfte nur `auth.me()` – jeder
   eingeloggte User konnte fremde Lernpakete mit Aktivitäten
   "zumüllen". Neu: `checkAssignPermission` lädt
   Lernpaket → Einheit → Benutzer/EinheitMembers und folgt der
   gleichen Logik wie alle anderen geschützten Endpunkte
   (Admin / Fachschaft-mit-Fach / EinheitMembers).

2. **Lock-Architektur respektieren.** Hält ein anderer User einen
   nicht-stale Lernpaket-Lock, schlägt das Anlegen mit 409 fehl.
   Eigener Lock oder fehlender Lock bleiben erlaubt – konsistent
   zur Lock-Philosophie aus §11.

3. **Foreign-Key-Existenz.** `lernpaket_id` und `aktivitaet_id`
   werden vor dem `create` parallel via `Promise.all` aus der DB
   geprüft (`Lernpakete.get` + `AktivitaetenKatalog.get`).
   Phase-Werte werden gegen ein Whitelist-Set validiert. Damit
   landet kein Datenmüll mehr in `LernpaketPhaseAktivitaet`, der
   später den Lernpfad-Architekten beim Render-Versuch crasht.

4. **Audit-Trail.** Erfolgreiche Zuordnungen werden via Inline-
   Kopie des `auditLogger`-Patterns als `CREATE` auf
   `LernpaketPhaseAktivitaet` protokolliert – inklusive
   `aktivitaet_name`, `phase` und `einheit_id` für die Forensik.
   Inline-Kopie folgt der NO-LOCAL-IMPORTS-Regel aus §10.

### @MIGRATION_NOTE (Supabase) – Defense-in-DB

Bei der Supabase-Migration übernimmt die Datenbank alle vier
Schutzschichten:

```sql
-- 1) Foreign Keys verhindern Müll-Inserts (Punkt 3):
ALTER TABLE lernpaket_phase_aktivitaet
  ADD CONSTRAINT fk_lernpaket
    FOREIGN KEY (lernpaket_id)  REFERENCES lernpakete(id)         ON DELETE CASCADE,
  ADD CONSTRAINT fk_aktivitaet
    FOREIGN KEY (aktivitaet_id) REFERENCES aktivitaeten_katalog(id) ON DELETE RESTRICT;

ALTER TABLE lernpaket_phase_aktivitaet
  ADD CONSTRAINT chk_phase CHECK (phase IN ('Input', 'Übung', 'Abschluss'));

-- 2) RLS regelt Punkt 1 (Tenant-Isolation):
CREATE POLICY assign_activity_write
  ON lernpaket_phase_aktivitaet FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM lernpakete p
      JOIN einheiten e ON e.id = p.einheit_id
      WHERE p.id = lernpaket_id
        AND user_can_write_einheit(auth.uid(), e.id)  -- helper function
    )
  );

-- 3) Lock-Check als CHECK-Constraint oder als Trigger
--    (BEFORE INSERT auf lernpaket_phase_aktivitaet):
CREATE OR REPLACE FUNCTION reject_if_locked_by_other()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE p lernpakete%ROWTYPE;
BEGIN
  SELECT * INTO p FROM lernpakete WHERE id = NEW.lernpaket_id;
  IF p.is_locked
     AND p.locked_by_email IS NOT NULL
     AND p.locked_by_email <> auth.jwt() ->> 'email'
     AND p.locked_at > NOW() - INTERVAL '30 minutes'
  THEN
    RAISE EXCEPTION 'lernpaket locked by %', p.locked_by_email
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER assign_activity_lock_check
BEFORE INSERT ON lernpaket_phase_aktivitaet
FOR EACH ROW EXECUTE FUNCTION reject_if_locked_by_other();

-- 4) Audit-Trail per AFTER INSERT-Trigger (vgl. §11/§12):
CREATE TRIGGER assign_activity_audit
AFTER INSERT ON lernpaket_phase_aktivitaet
FOR EACH ROW EXECUTE FUNCTION write_audit_log();
```

Damit schrumpft der gesamte JS-Endpunkt auf einen einzigen
`INSERT INTO lernpaket_phase_aktivitaet …`-Call – die DB blockt
fehlende RBAC, ungültige Phasen, kaputte FKs und Lock-Verstöße
selbständig ab.

### Definition of Done für die Migration

- [ ] Foreign Keys + CHECK-Constraint auf `phase` aktiv.
- [ ] RLS-Policy `assign_activity_write` deckt Tenant-Isolation ab.
- [ ] Trigger `assign_activity_lock_check` verhindert Schreiben über
      fremde Locks.
- [ ] Audit-Trigger ersetzt den Inline-`logAudit`-Call.

---

## 14. Dual-Lock-Auflösung serverseitig (2026-04-26)

### Ausgangslage

`AllgemeineAufgabe` trägt **zwei** Sync-Status: `moodle_sync_status` und
`brian_sync_status`. Erst wenn BEIDE auf `synced` stehen, soll die
Bearbeitungssperre (`locked_by` / `locked_at`) entfallen. Bisher wurde
diese Verknüpfung **vom Frontend orchestriert**:

1. UI ruft `confirmExportCompletion` (Moodle) bzw.
   `entities.AllgemeineAufgabe.update({ brian_sync_status: 'synced' })`
   (Brian) auf.
2. UI ruft DANACH `checkAndReleaseDualLock` auf, das prüft, ob beide
   Sync-Felder synced sind, und den Lock entfernt.

**Problem.** Schließt der Browser-Tab oder bricht das Netzwerk zwischen
Schritt 1 und Schritt 2 ab, bleibt die Aufgabe für immer als
"gesperrt" markiert (Zombie-Lock). Außerdem hatte
`checkAndReleaseDualLock` weder RBAC noch Tenant-Isolation.

### Umsetzung (Option A – Inline serverseitig)

Der Lock-Release wandert in **dieselbe Server-Operation**, die den
Sync-Status setzt. Damit ist der Übergang aus Sicht des Aufrufers
atomar; ein zweiter Round-Trip entfällt.

**Pfad Moodle (`functions/confirmExportCompletion`):**

```
for (const id of successfulIds) {
  const resolved = resolve(id);                    // Tenant-Filter
  const updatePayload = { sync_status: 'synced', last_synced_at: now };

  if (resolved.type === 'AllgemeineAufgabe') {
    updatePayload.moodle_sync_status = 'synced';
    if (resolved.record.brian_sync_status === 'synced') {
      updatePayload.locked_by = null;
      updatePayload.locked_at = null;              // ← Dual-Lock-Release
    }
  }
  promises.push(entities[resolved.type].update(id, updatePayload));
}
await Promise.allSettled(promises);
```

**Pfad Brian (`functions/confirmBrianExport`, NEU):**

Der Brian-Cockpit-Pfad ging vorher direkt über das SDK
(`entities.AllgemeineAufgabe.update`) und damit am Server-Hook vorbei.
Deshalb gibt es jetzt einen kleinen, fokussierten Endpunkt:

```
const moodleAlreadySynced =
  aufgabe.moodle_sync_status === 'synced' || aufgabe.sync_status === 'synced';

const updatePayload = {
  brian_sync_status: 'synced',
  brian_synced_at: now,
  ...(moodleAlreadySynced ? { locked_by: null, locked_at: null } : {}),
};
await entities.AllgemeineAufgabe.update(aufgabe_id, updatePayload);
```

Beide Endpunkte nutzen die zentrale RBAC-Prüfung
(Admin / Fachschaft-mit-Fach / EinheitMembers), die bereits in
`acquireUnitLockSecure`, `approveMasterAufgabe` und
`approvePackageActivities` etabliert ist.

### Bereinigung

- `functions/checkAndReleaseDualLock` **gelöscht**.
- `components/export/MoodleExportView`: `confirmMutation` ruft nur noch
  `confirmExportCompletion`. Der parallele
  `checkAndReleaseDualLock`-Call entfällt.
- `components/export/BrianExportCockpitView.handleMarkAsSynced`:
  Direkter `entities.update` ersetzt durch
  `functions.invoke('confirmBrianExport', …)`.

### OCC-Frage

`AllgemeineAufgabe` trägt aktuell **kein** `version`-Feld. Die
Race-Condition zwischen "Moodle setzt synced" und "Brian setzt synced"
ist unkritisch, weil:

- Beide Pfade prüfen den Gegen-Status SERVER-seitig direkt vor dem
  Update (frischer Read im selben Request).
- Der schlimmste verbliebene Effekt einer echten Race-Condition wäre
  ein temporär gehaltener Lock, der beim nächsten der beiden
  Bestätigungen sofort fällt – kein Zombie-Lock, kein Datenverlust.

Sollte später ein dritter Pfad `synced` setzen können, ist das
`version`-Feld auf `AllgemeineAufgabe` nachzurüsten und beide
Endpunkte auf das Pattern aus §3 (Read-Bump-ReRead-Verify) umzustellen.

### @MIGRATION_NOTE (Supabase)

Die gesamte Inline-Logik ersetzt EIN Trigger:

```sql
CREATE OR REPLACE FUNCTION release_dual_lock_when_synced()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.moodle_sync_status = 'synced'
     AND NEW.brian_sync_status = 'synced'
     AND (OLD.moodle_sync_status <> 'synced' OR OLD.brian_sync_status <> 'synced')
  THEN
    NEW.locked_by := NULL;
    NEW.locked_at := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_release_dual_lock
BEFORE UPDATE OF moodle_sync_status, brian_sync_status
ON allgemeine_aufgabe
FOR EACH ROW EXECUTE FUNCTION release_dual_lock_when_synced();
```

Damit übernimmt PostgreSQL die Garantie, dass der Lock **immer**
synchron zum letzten der beiden Sync-Wechsel fällt – egal über welchen
API-Pfad das Update kommt. Die JS-Inline-Blöcke in
`confirmExportCompletion` und `confirmBrianExport` entfallen dann.

### Definition of Done für die Migration

- [ ] BEFORE-UPDATE-Trigger `trg_release_dual_lock` aktiv.
- [ ] Inline-Lock-Release in `confirmExportCompletion` entfernt.
- [ ] `confirmBrianExport` zu schlankem RPC reduziert (nur
      `brian_sync_status` setzen, Trigger erledigt den Rest).
- [ ] RLS-Policy auf `allgemeine_aufgabe` deckt die RBAC-Prüfung ab.

---

## 15. Manueller Export-Workflow: Notfall-Override + sync_status-Deprecation (2026-04-26)

### Hintergrund: "Human-in-the-loop"-Risiko

Moodle und Brian schicken **keine Webhooks** zurück ins System. Der
Status-Wechsel auf `synced` wird **manuell von einem Admin** im UI
bestätigt (`confirmExportCompletion`, `confirmBrianExport`). Wird
diese Bestätigung vergessen ("Verpennen"), bleibt die zugehörige
`AllgemeineAufgabe` für ALLE Lehrkräfte gesperrt – ohne Heilung.

### Lösung: dedizierter Notfall-Endpunkt

Statt das `force`-Flag in die regulären Endpunkte zu mischen, gibt es
einen klar abgegrenzten Notfall-Pfad:

**`functions/forceReleaseTaskLockAdmin`**

| Eigenschaft | Wert |
|---|---|
| Berechtigung | NUR globaler Admin (`User.role === 'admin'` oder `Benutzer.rolle === 'Administrator'`). Kein Fachschafts-/EinheitMembers-Fallback. |
| Pflichtparameter | `aufgabe_id`, `reason` (min. 5 Zeichen). |
| Was wird verändert | NUR `locked_by = null`, `locked_at = null`. |
| Was wird NICHT verändert | `moodle_sync_status`, `brian_sync_status`, `last_synced_at`. |
| Audit | `UPDATE`-Eintrag mit `force_release: true`, `reason`, `previous_locked_by`, `lock_age_hours`. |

**Begründung der Trennung.** Würde der Notfall-Pfad den Sync-Status
"synced" setzen, ohne dass tatsächlich exportiert wurde, würde die
Export-Wahrheit verfälscht. Ein Admin, der nur den Lock brechen will,
darf nichts an der Sync-Wahrheit verändern. Die Trennung ist auch
forensisch sauber: Audit-Logs zeigen, ob ein Lock regulär (`trigger:
'confirmExportCompletion'` / `'confirmBrianExport'`) oder per Override
(`force_release: true`) gefallen ist.

### Stale-Lock-Hinweis (UI-Empfehlung)

Der Server prüft das Lock-Alter NICHT als blockierende Bedingung,
liefert es aber im Audit-Log mit (`lock_age_hours`). Das Frontend soll
den "Force-Release"-Button bevorzugt sichtbar machen, wenn der Lock
älter als **24 h** ist – damit ist dem Admin signalisiert, dass es
sich vermutlich um einen vergessenen Bestätigungs-Klick handelt.
Frühere Eingriffe bleiben möglich (z. B. direkt nach manuellem
Moodle-Upload), erfordern aber bewusste Begründung im `reason`-Feld.

### Audit-Erweiterungen (regulärer Pfad)

Beide regulären Bestätigungs-Endpunkte schreiben jetzt zusätzlich
einen Audit-Eintrag, sobald der Dual-Lock-Release greift:

- `confirmExportCompletion`: `bulkCreate` über alle Aufgaben, deren
  Lock durch DIESEN Aufruf fällt (`trigger:
  'confirmExportCompletion'`).
- `confirmBrianExport`: einzelner `create` pro Aufgabe (`trigger:
  'confirmBrianExport'`).

Damit ist jeder Lock-Bruch im System lückenlos attribuierbar.

### Deprecation: `sync_status` auf `AllgemeineAufgabe`

**Problem.** Auf `AllgemeineAufgabe` existieren historisch DREI
Sync-Felder:

| Feld | Status |
|---|---|
| `sync_status` | **DEPRECATED** – nur noch für Frontend-Backward-Compat parallel gepflegt. |
| `moodle_sync_status` | **Kanonisch** für den Moodle-Pfad. |
| `brian_sync_status` | **Kanonisch** für den Brian-Pfad. |

`confirmExportCompletion` setzt `sync_status` und `moodle_sync_status`
parallel, damit alter Frontend-Code (z. B. `MoodleExportView.stats`,
das `sync_status === 'pending'` filtert) konsistent bleibt.
`confirmBrianExport` toleriert beim Pre-Check ebenfalls beide Felder
(`moodle_sync_status === 'synced' || sync_status === 'synced'`).

**Plan:**

1. **Kurzfristig (Bestand):** Beide Felder werden in `confirmExportCompletion` synchron geschrieben. Read-Pfade müssen beide tolerieren.
2. **Mittelfristig (Cleanup-PR):** Frontend-Konsumenten von `AllgemeineAufgabe.sync_status` (Suche im Repo: `MoodleExportView`, evtl. `ExportCockpitView`) auf `moodle_sync_status` umstellen.
3. **Migration (Supabase):** `sync_status`-Spalte aus `allgemeine_aufgabe` entfernen, sobald Schritt 2 abgeschlossen ist. Andere Entitäten (`lernpakete`, `master_aufgabe`, `aufgabenbausteine`, `lernpaket_phase_aktivitaet`, `einheiten`) behalten `sync_status` weiter – dort gibt es nur EINEN Export-Pfad.

### @MIGRATION_NOTE (Supabase) – Auto-Release + Notfall-RPC

```sql
-- 1) Trigger-basierter Auto-Release (vgl. §14):
CREATE OR REPLACE FUNCTION release_dual_lock_when_synced()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.moodle_sync_status = 'synced'
     AND NEW.brian_sync_status = 'synced'
     AND (OLD.moodle_sync_status <> 'synced' OR OLD.brian_sync_status <> 'synced')
  THEN
    NEW.locked_by := NULL;
    NEW.locked_at := NULL;
    -- Audit via separater INSERT in audit_log (AFTER UPDATE):
  END IF;
  RETURN NEW;
END $$;

-- 2) Notfall-RPC bleibt erhalten (Admin-only, SECURITY DEFINER):
CREATE OR REPLACE FUNCTION force_release_task_lock(
  task_id UUID,
  reason TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT user_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = 'P0001';
  END IF;
  IF reason IS NULL OR length(trim(reason)) < 5 THEN
    RAISE EXCEPTION 'reason required (min 5 chars)' USING ERRCODE = 'P0001';
  END IF;

  UPDATE allgemeine_aufgabe
     SET locked_by = NULL,
         locked_at = NULL
   WHERE id = task_id;

  INSERT INTO audit_log (
    user_email, action, resource_type, resource_id, changes, status
  ) VALUES (
    auth.jwt() ->> 'email', 'UPDATE', 'AllgemeineAufgabe', task_id,
    jsonb_build_object('force_release', true, 'reason', reason),
    'success'
  );
END $$;

-- 3) sync_status-Spalte droppen (NACH Frontend-Cleanup):
ALTER TABLE allgemeine_aufgabe DROP COLUMN sync_status;
```

### Definition of Done für die Migration

- [ ] Frontend-Read-Pfade auf `moodle_sync_status` umgestellt.
- [ ] `sync_status`-Spalte auf `allgemeine_aufgabe` gedroppt.
- [ ] `release_dual_lock_when_synced`-Trigger aktiv (vgl. §14).
- [ ] `force_release_task_lock`-RPC ersetzt
      `forceReleaseTaskLockAdmin`-Function.
- [ ] Audit-Trigger schreibt sowohl reguläre Auto-Releases als auch
      Force-Releases automatisch.

---

## 16. Batch-Limits für Bulk-Operationen (2026-04-26)

### Hintergrund

`confirmExportCompletion` akzeptiert zwei Listen (`successfulIds`,
`failedIds`) und feuert pro ID ein parallelisiertes `update()` über
`Promise.allSettled`. Das ist robust gegen einzelne Fehler, aber ohne
Obergrenze ergeben sich drei reale Risiken:

1. **DB-Sturm.** Ein einzelner Aufruf mit z. B. 10 000 IDs erzeugt
   10 000 parallele `update()`-Calls und blockiert andere Operationen.
2. **Unhandlicher Audit-Eintrag.** Der Dual-Lock-Audit aus §15 nutzt
   `bulkCreate` über alle freigegebenen Aufgaben. Bei vielen Tausend
   Einträgen in einem Zug verliert der Audit-Trail seine Lesbarkeit.
3. **UX-Inkonsistenz.** Der Admin im Cockpit erwartet ein klares
   "Erfolg / Fehler"-Feedback. Sehr große Batches verlängern die
   Antwortzeit ohne Mehrwert – und sind ein Indiz für einen ungesund
   gewachsenen Backlog.

### Implementierung

Hartes Limit von **200 IDs** (`successfulIds.length + failedIds.length`)
direkt nach der Eingangsvalidierung. Überschreitungen werden mit
**HTTP 413 Payload Too Large** beantwortet:

```json
{
  "error": "Batch-Limit überschritten: 350 IDs übergeben, max. 200 pro Aufruf. …",
  "code": "BATCH_TOO_LARGE",
  "max_batch": 200,
  "received": 350
}
```

Damit kann das Frontend pre-emptiv splitten oder dem Admin einen
sinnvollen Hinweis geben, wenn er versucht, einen riesigen Backlog auf
einmal zu bestätigen.

### Warum 200?

- Deckt praktisch alle realen Cockpit-Szenarien ab (eine Einheit hat
  selten mehr als ~50 freigegebene Aufgaben gleichzeitig pending).
- Matcht das Pagination-Limit aus Phase 6.5 – konsistente Obergrenze
  über das gesamte Backend.
- Ein einzelner `bulkCreate`-Audit über 200 Einträge bleibt
  performant und im Log-Viewer noch lesbar.

### Andere Bulk-Endpunkte

`approvePackageActivities` (§12) und `assignActivityToLernpaket` (§13)
arbeiten heute auf naturgemäß kleinen Mengen (Activities pro
Lernpaket, einzelne Zuordnung). Ein explizites Limit ist dort aktuell
nicht nötig, sollte aber bei der nächsten größeren Erweiterung
mitgedacht werden – einheitlich auf 200, um eine systemweite Konvention
zu etablieren.

### @MIGRATION_NOTE (Supabase)

Postgres erlaubt prinzipiell deutlich größere Bulk-Updates per
einzelnem `UPDATE … WHERE id = ANY($1)`. Das Limit bleibt trotzdem
sinnvoll – aber als **API-Gateway-Regel**, nicht als DB-Constraint:

```js
// Edge-Function bleibt der API-Layer, der das Limit erzwingt.
// Die eigentliche DB-Operation wird in EINEN UPDATE-Call zusammengezogen:
UPDATE allgemeine_aufgabe
   SET moodle_sync_status = 'synced',
       last_synced_at     = NOW()
 WHERE id = ANY($1::uuid[]);
```

Damit fällt die JS-Schleife komplett weg, die Audit-Einträge erzeugt
ein `AFTER UPDATE`-Trigger – und das 200-Limit sorgt weiterhin für
saubere Cockpit-UX.

### Definition of Done für die Migration

- [ ] Hard-Limit (200) als API-Gateway-Regel in der Edge-Function
      erhalten.
- [ ] DB-Updates auf Set-Based SQL umgestellt (`id = ANY($1)`).
- [ ] Audit-Einträge per Trigger statt App-Code.
- [ ] Frontend-Code splittet pre-emptiv bei > 200 IDs (statt erst auf
      413 zu reagieren).

---

## 17. Lernpaket-Vollständigkeits-Aggregat (`is_complete`) (2026-04-27)

### Problem

Tab 4 zeigt für eine einzelne Aktivität "Vollständig", aber das
übergeordnete Lernpaket (Tab 3, Sidebar, Übersichts-Badge) bleibt rot.
Klassische Zustands-Desynchronisation: das Frontend hat den Status
clientseitig aus den Aktivitäten aggregiert, der lokale Cache wurde
nach dem Save nicht invalidiert, das Backend kannte gar kein
Aggregat-Feld.

### Verbindliche Definition of Done

Ein Lernpaket gilt als **vollständig** (`Lernpakete.is_complete = true`)
genau dann, wenn:

1. **Alle aktiven Phasen-Aktivitäten** des Pakets haben
   `is_complete: true` und sind keine Tombstones
   (`sync_status !== 'to_delete'`).
2. **Alle zugehörigen MasterAufgaben** (sofern vorhanden) haben
   `content_status: 'approved'`. Ein Paket ohne Master ist auf dieser
   Achse automatisch erfüllt.
3. **Phasen ohne Aktivitäten** zählen nicht (irrelevant, blockieren nicht).
4. Ein Paket **ohne jegliche lebende Aktivität** ist `is_complete = false`
   (es gibt nichts, was abgeschlossen wäre).

### Implementierung

#### Schema

`Lernpakete.is_complete` (Boolean, default `false`) ergänzt. Frontend
liest ausschließlich aus diesem Feld – keine clientseitige Aggregation
mehr.

#### Backend-Roll-up

Die Aggregat-Berechnung lebt zentral in
`functions/utils/lernpaketRollup.js` (Single Source of Truth, `recalculateLernpaketComplete`).
Wegen der NO-LOCAL-IMPORTS-Regel (siehe §4b) wird der Block INLINE in
jeden konsumierenden Endpunkt kopiert. Aktuelle Inline-Kopien:

| Endpunkt | Auslöser |
|---|---|
| `updateActivitySecure` | Tab 4 "Speichern & Fertig" auf einer Aktivität |
| `approveMasterAufgabe` | Master wird approved/unapproved (Tab 4 / Aufgaben-Werkstatt) |
| `deleteActivityWithTombstoneAndCascade` | Tab 3 löscht eine Aktivität (Tombstone) |

Eigenschaften des Roll-ups:

- **Idempotent.** Schreibt nur, wenn sich `is_complete` tatsächlich
  ändert – kein unnötiger Audit-/Version-Bump.
- **Fail-soft.** Roll-up-Fehler werden geloggt, brechen aber den
  Hauptpfad nicht ab. Wenn das Aggregat einmal driftet, repariert es
  sich beim nächsten Save automatisch.
- **Stale-Read-Schutz.** Jeder Endpunkt überschreibt im frisch geladenen
  Geschwister-Set den eigenen, gerade gesetzten Wert manuell, statt
  einen zweiten Roundtrip zu riskieren.

#### Frontend

`components/workspace/SidebarTree.jsx` (`LernpaketNode.hatUnvollstaendigeAktivitaet`)
liest ab sofort `paket.is_complete !== true`, NICHT mehr
`paketPhaseActivities.some(a => !a.is_complete)`. Damit ist der Stale-
Cache-Effekt aus Tab 3 verschwunden – sobald `Lernpakete` invalidiert
wird (was nach jedem `updateActivitySecure`-Erfolg ohnehin passiert),
zieht der Badge nach.

### Bekannte Race Conditions

- Zwei User speichern parallel zwei Aktivitäten desselben Pakets:
  Beide lesen das Geschwister-Set, beide rechnen, beide schreiben.
  Das Ergebnis ist deterministisch (Zielwert = derselbe), aber der
  letzte Schreiber gewinnt. Falls dazwischen ein dritter Pfad das
  Aggregat verändert, korrigiert sich der Wert beim nächsten Save.
- `bulkApprove`-Pfade (`approvePackageActivities`) rufen den Roll-up
  HEUTE NICHT auf – sie setzen Activities und Master in einem Schwung
  auf `approved`, das Aggregat zieht erst beim nächsten Einzel-Save
  nach. Akzeptiertes Risiko, weil Bulk-Approve ohnehin nur erlaubt
  ist, wenn alle Activities bereits vollständig sind.

### @MIGRATION_NOTE (Supabase)

Die JS-Aggregation entfällt komplett. Ein einziger Trigger ersetzt
alle drei Inline-Blöcke:

```sql
CREATE OR REPLACE FUNCTION recalc_lernpaket_is_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pkg_id uuid;
  living_count int;
  unfinished_count int;
  master_unapproved_count int;
BEGIN
  pkg_id := COALESCE(NEW.lernpaket_id, OLD.lernpaket_id);
  IF pkg_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COUNT(*) FILTER (WHERE sync_status <> 'to_delete'),
         COUNT(*) FILTER (WHERE sync_status <> 'to_delete' AND is_complete IS NOT TRUE)
    INTO living_count, unfinished_count
    FROM lernpaket_phase_aktivitaet
   WHERE lernpaket_id = pkg_id;

  SELECT COUNT(*) FILTER (WHERE content_status <> 'approved')
    INTO master_unapproved_count
    FROM master_aufgabe
   WHERE lernpaket_id = pkg_id;

  UPDATE lernpakete
     SET is_complete = (living_count > 0
                        AND unfinished_count = 0
                        AND master_unapproved_count = 0)
   WHERE id = pkg_id;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_recalc_lernpaket_aktivitaet
AFTER INSERT OR UPDATE OR DELETE ON lernpaket_phase_aktivitaet
FOR EACH ROW EXECUTE FUNCTION recalc_lernpaket_is_complete();

CREATE TRIGGER trg_recalc_lernpaket_master
AFTER INSERT OR UPDATE OR DELETE ON master_aufgabe
FOR EACH ROW EXECUTE FUNCTION recalc_lernpaket_is_complete();
```

### Definition of Done für die Migration

- [ ] Trigger `recalc_lernpaket_is_complete` aktiv, beide Auslöser
      (`lernpaket_phase_aktivitaet` + `master_aufgabe`) verdrahtet.
- [ ] Inline-Kopien aus `updateActivitySecure`, `approveMasterAufgabe`,
      `deleteActivityWithTombstoneAndCascade` entfernt.
- [ ] `functions/utils/lernpaketRollup.js` gelöscht.
- [ ] Frontend bleibt unverändert – liest weiterhin
      `paket.is_complete`, nur die Quelle des Schreibens wandert von
      App-Code in DB-Trigger.