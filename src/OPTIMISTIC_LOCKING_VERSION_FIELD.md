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