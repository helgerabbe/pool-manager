# Technischer Bericht: Bearbeitungsmodus & Sperrsystem

**Erstellt für:** Externe Prüfungs-/Beratungsabteilung
**Stand:** 2026-06-10
**Geltungsbereich:** Vollständige technische Beschreibung des kollaborativen Bearbeitungsmodus („Locking-System") der Plattform — Logik, technische Umsetzung, Sicherheits- und Konsistenzmechanismen sowie bekannte Grenzen.

---

## 1. Zweck und Grundidee

Die Plattform ist ein **kollaboratives Autorensystem**: mehrere Lehrkräfte, Fachschaftsleitungen und Administratoren arbeiten gleichzeitig an gemeinsamen Inhalten (Einheiten, Themenfeldern, Lernpaketen, Aktivitäten, Aufgaben).

Um **gleichzeitige, widersprüchliche Bearbeitung derselben Ressource** zu verhindern (Lost-Update-Problem), existiert ein **explizites, pessimistisches Sperrsystem** mit dem Konzept eines „Bearbeitungsmodus":

- Eine Ressource ist standardmäßig **schreibgeschützt** (read-only).
- Eine Lehrkraft muss aktiv den **Bearbeitungsmodus** betreten → erwirbt damit eine **exklusive Sperre (Lock)** auf die Ressource.
- Solange die Sperre gehalten wird, sehen andere Nutzer die Ressource als „wird gerade bearbeitet von X" und können nicht selbst editieren.
- Beim Verlassen des Bearbeitungsmodus wird die Sperre **freigegeben**.

Das System kombiniert pessimistisches Locking (exklusive Sperre) mit **optimistischer Nebenläufigkeitskontrolle (OCC, `version`-Feld)** als zweite Verteidigungslinie und mit **Echtzeit-Synchronisation (Server-Sent Events)**, damit Sperrwechsel sofort sichtbar werden.

---

## 2. Sperr-Ebenen (Locking-Hierarchie)

Es gibt mehrere Sperr-Ebenen, die hierarchisch zusammenwirken:

| Ebene | Entität | Sperr-Felder | Erwerb über |
|-------|---------|--------------|-------------|
| **Einheit (strukturell)** | `Einheiten` | `structural_lock`, `structural_locked_at` | `acquireUnitLockSecure` (scope `structure` / `dashboard`) |
| **Lernpaket** | `Lernpakete` | `is_locked`, `locked_by_email`, `locked_at` | `acquireLockSecure` |
| **Allgemeine Aufgabe** | `AllgemeineAufgabe` | `locked_by`, `locked_at` | `lockTaskSecure` |
| **Projekt-Aufgabe** | `AllgemeineAufgabe` (Projekt) | `locked_by`, `locked_at` | `lockProjectTaskSecure` |
| **Aufgabenbaustein** | `Aufgabenbausteine` | `lock_status`, `locked_by_user`, `locked_at` | (analoge Logik) |

### Hierarchische Verriegelung
Der **Struktur-Lock auf Einheiten-Ebene** ist übergeordnet. Beim Erwerb eines Unit-Locks (`acquireUnitLockSecure`) wird ein **Deep Scan** durchgeführt: Existiert noch ein aktiver Lernpaket- oder Aufgaben-Lock einer anderen Lehrkraft innerhalb der Einheit, wird der Unit-Lock **verweigert** (HTTP 409). Damit wird verhindert, dass strukturelle Änderungen (Themenfelder verschieben, Lernpakete umsortieren) die laufende Detailarbeit einer anderen Person überschreiben.

Umgekehrt verweigert `acquireLockSecure` einen Lernpaket-Lock, solange ein **struktureller Unit-Lock** aktiv ist.

---

## 3. Lebenszyklus einer Sperre

### 3.1 Erwerb (Acquire)

Der Erwerb folgt einem **OCC-gestützten Read-Bump-Verify-Protokoll** (zentral definiert in `functions/utils/occLockUtils.js`, wegen der „No Local Imports"-Beschränkung von Deno Deploy **inline in jede Lock-Funktion kopiert**):

1. **INITIAL READ** — Datensatz inkl. `version` laden (über Service-Rolle, siehe §6).
2. **STATE CHECK** — Sperr-Feld leer / gehört bereits mir / abgelaufen (stale) → OK. Sonst: `busy` (409).
3. **ATOMIC-LIKE UPDATE** — Sperr-Feld = eigene E-Mail, Zeitstempel = jetzt, `version + 1`.
4. **RE-READ + VERIFY (mit Retry)** — frischer Re-Read über Service-Rolle. Steht die eigene E-Mail im Sperr-Feld → Erfolg. Steht eine **fremde** E-Mail → echter `race_lost`. Ist das Feld noch leer (Replikationsverzögerung), wird bis zu 3× mit Backoff (120/240/360 ms) erneut gelesen.

> **First-Mover-Disziplin:** Die Verifikation prüft **ausschließlich die E-Mail des Sperr-Inhabers, nicht das Versions-Inkrement**. Ein `race_lost` löst **kein Rollback** aus — das würde den rechtmäßigen Gewinner aussperren.

### 3.2 Halten (Heartbeat)

Während der Bearbeitungsmodus aktiv ist, sendet das Frontend (`hooks/useLocks.js`) alle **25 Sekunden** einen **Heartbeat**: ein Update auf `locked_at = jetzt`. Damit signalisiert die Session „ich lebe noch".

### 3.3 Freigabe (Release)

Beim Verlassen ruft das Frontend `releaseLernpaketLockSecure` (bzw. das jeweilige Pendant) auf. Die Freigabe prüft **ausschließlich die Eigentümerschaft** (`locked_by_email === aktueller User` ODER Admin) und setzt die Sperr-Felder zurück. Es wird **bewusst kein Zeitstempel-Vergleich** mehr durchgeführt (siehe §7.2).

### 3.4 Automatische Bereinigung (Reaper)

Eine geplante Automation (`functions/lockReaper`, **alle 30 Sekunden**) räumt **verwaiste Sperren** auf, deren `locked_at` älter als **5 Minuten** ist (Tab geschlossen, Browser-Crash, AFK). Da aktive Sessions alle 25 s einen Heartbeat senden, trifft der Reaper nur wirklich tote Sessions.

- DB-seitiges Filtern (`lockField != null` UND `locked_at < Threshold`) mit Fallback auf paginiertes clientseitiges Filtern.
- Parallele Batch-Updates (50 pro Batch).
- Abgesichert durch `AUTOMATION_SECRET` (oder manueller Admin-Trigger).

### 3.5 Admin-Zwangsfreigabe

`functions/forceReleaseLockAdmin` erlaubt **ausschließlich Administratoren**, jede Sperre zwangsweise aufzuheben. Jeder Eingriff wird **revisionssicher im `AuditLog`** mit `event: FORCE_UNLOCK` und vorherigem Sperr-Inhaber protokolliert.

---

## 4. Echtzeit-Synchronisation (SSE)

`functions/sseUpdates` stellt einen **Server-Sent-Events-Stream** bereit, über den das Frontend Sperrwechsel **in Echtzeit** erhält — statt periodischem Polling.

- Beobachtete Entitäten: `Einheiten`, `Lernpakete`.
- **Field-Level Security:** Nur eine Whitelist sperr-relevanter Felder (`is_locked`, `locked_by_email`, `structural_lock`, `structural_locked_at`, `version`) verlässt den Server. **Keine Inhalts-/Textfelder** werden je über den Stream übertragen.
- Subscriptions laufen bewusst über das **User-Token (RLS aktiv)**, damit die Tenant-Isolation auch für Echtzeit-Events greift.
- Heartbeat alle 15 s gegen NAT-Timeouts; sauberes Cleanup bei Disconnect.

Das Frontend patcht eingehende Events direkt in den React-Query-Cache → Sperrstatus wird ohne Reload sofort sichtbar.

---

## 5. Frontend-Architektur (`hooks/useLocks.js`)

Eine **zentrale generische Lock-Engine** (`useGenericLock`) verwaltet den gesamten Lebenszyklus; spezifische Hooks (`useLernpaketLock`, `useEinheitLock`, `useTaskLock`) konfigurieren sie:

- Hält den aktuellen User, Sperr-Status, `canEdit`, Fehlertexte.
- Verwaltet Heartbeat-Timer (25 s) bzw. Polling-Fallback.
- **Rate-Limit-Schutz:** Funktions-Props werden in Refs gehalten, damit der Initial-Check nicht bei jedem Render neu feuert; bei HTTP 429 greift Exponential Backoff (2 s, 4 s).
- **Stale-Schwelle clientseitig: 5 Minuten** (synchron zu Backend & Reaper).
- **Sicherheitsnetz:** `beforeunload`-Listener stoppt Timer beim Tab-Schließen.
- **Defensive Erfolgsprüfung beim Acquire:** Da das SDK bei HTTP 409/423/500 nicht immer eine Exception wirft, wird Status **und** `error`-Feld der Antwort explizit ausgewertet, bevor `canEdit` auf `true` gesetzt wird.

---

## 6. Sicherheits- und Berechtigungsmodell (RBAC)

Jede Lock-Funktion ist serverseitig abgesichert (`createClientFromRequest` + `auth.me()`):

1. **Administrator** → uneingeschränkt.
2. **Fachschaftsleitung** → nur **mit Fachzuständigkeit** für `einheit.fach`.
3. **Sonst** → explizite Mitgliedschaft in `EinheitMembers` (für Unit-Locks: Rolle `LEITUNG`).

Datenzugriffe innerhalb der Lock-Logik laufen über `base44.asServiceRole` (RLS-frei, konsistente Quelle) — die **Berechtigung wird vorher explizit im Code geprüft**. Konflikte und Erfolge werden im `AuditLog` protokolliert.

### Lifecycle-Hard-Lock
Einheiten im Status `final_freigegeben` oder `export_running` können **gar nicht** zur Bearbeitung gesperrt werden (HTTP 423) — auch nicht durch Administratoren. Damit ist der Export-Workflow vor nachträglichen Änderungen geschützt.

---

## 7. Bekannte, behobene Schwachstellen (Historie 2026-06-10)

Im Zuge der jüngsten Härtung wurden **zwei** zusammenhängende Defekte identifiziert und behoben:

### 7.1 Self-Lockout beim Erwerb („race_lost gegen sich selbst")
**Ursache:** Der STATE-CHECK las über das **User-Token (RLS, ggf. replikations-/cache-verzögert)**, die VERIFY-Phase aber über die **Service-Rolle**. Diese inkonsistenten Lesequellen führten dazu, dass der rechtmäßige Gewinner seinen eigenen, frisch geschriebenen Lock im Verify noch nicht sah und sich fälschlich mit `race_lost` selbst aussperrte.
**Fix:** READ **und** VERIFY laufen jetzt **beide über die Service-Rolle**; VERIFY mit Retry-Schleife (3×, Backoff).

### 7.2 „Bearbeitungsmodus lässt sich nicht beenden" (Heartbeat-Kollision)
**Ursache:** Die Freigabe-Funktion verglich beim Release den `locked_at`-Zeitstempel (OCC). Da der **Heartbeat diesen alle 25 s neu schreibt**, schlug die Freigabe nach dem ersten Heartbeat dauerhaft mit `409 LOCK_CHANGED` fehl → der Nutzer blieb **permanent im Bearbeitungsmodus gefangen**.
**Fix:** Die Freigabe prüft jetzt **ausschließlich die Eigentümerschaft** (`locked_by_email`); der volatile Zeitstempel-Vergleich wurde entfernt.

### 7.3 Rollenabhängigkeit der Symptome (Beobachtung)
Es wurde beobachtet, dass **Administratoren und Fachschaftsleitungen** das Self-Lockout-Problem praktisch nie erlebten, **normale Fachlehrkräfte** hingegen häufig. Erklärung: Lese-Operationen über das User-Token unterliegen für Fachlehrkräfte der **RLS-Filterung über `EinheitMembers`** — der einzige Pfad, der für die genannte Replikationsverzögerung anfällig war. Admins umgehen RLS, Fachschaftsleitungen nutzen oft einen priorisierten RBAC-Pfad. Der Fix aus §7.1 (Service-Rolle für READ+VERIFY) eliminiert diesen Rollenunterschied im Erwerb.

### 7.4 Status-Check `checkLockSecure` auf Service-Rolle umgestellt (geschlossen)
**Ursache:** `functions/checkLockSecure` las den Sperrstatus über `base44.entities` (User-Token + RLS). Für normale Fachlehrkräfte (Zugriff via `EinheitMembers`) war dies derselbe replikations-/cache-verzögerungsanfällige Pfad wie in §7.1/§7.3 — und konnte einen veralteten Lock-Status ans Frontend melden. Admins/Fachschaftsleitungen umgehen RLS und sahen das Problem nicht.
**Fix:** Lesen jetzt über `base44.asServiceRole` → konsistente Quelle, rollenunabhängiger Status-Check. Damit ist die letzte Stelle des Rollen-Zusammenhangs geschlossen.

### 7.5 TOCTOU bei hierarchischen Unit-Locks abgemildert (Re-Scan)
**Ursache:** Deep Scan (Phase 2) und OCC-Lock-Write (Phase 3) in `acquireUnitLockSecure` laufen nicht in einer DB-Transaktion. Im Fenster dazwischen konnte eine andere Lehrkraft einen untergeordneten Lernpaket-/Aufgaben-Lock erwerben → kurzzeitig gleichzeitig gehaltene, widersprüchliche Sperren.
**Fix (pragmatisch, plattformbedingt):** Nach dem erfolgreichen Unit-Lock erfolgt ein **erneuter Deep Scan (Phase 4b)**. Wird ein konkurrierender untergeordneter Lock gefunden, wird der gerade erworbene Unit-Lock **idempotent zurückgerollt** und der Erwerb scheitert sauber (HTTP 409) — der untergeordnete Bearbeiter behält seine Arbeit. Das schließt das Fenster praktisch, ersetzt aber **keine** echte DB-Transaktion (vollständige Atomarität erst nach Supabase-Migration via Stored Procedure — siehe §8, Punkt 1).

---

## 8. Bewertung der Konsistenzgarantien (für die Prüfung)

**Stärken:**
- Klares, mehrschichtiges Schutzmodell (pessimistischer Lock + OCC `version` + Echtzeit-SSE + Reaper).
- Konsistente Lesequelle (Service-Rolle) im kritischen Erwerbspfad.
- Saubere RBAC-Trennung und revisionssichere Audit-Protokollierung jeder Zwangsfreigabe und jedes Konflikts.
- Field-Level-Security im Echtzeit-Stream.
- Selbstheilung durch Reaper + kurze 5-Min-Stale-Schwelle.

**Architektonische Grenzen / Empfehlungen:**
1. **Keine echte DB-seitige Atomarität.** Read-Bump-Verify ist „atomic-like", aber nicht transaktional. Ein theoretisches Restrisiko für Cross-Table-Races (Unit-Deep-Scan + OCC-Update sind zwei getrennte Schritte) besteht. → **Empfehlung:** Nach Supabase-Migration in eine `pl/pgsql`-Stored-Procedure bzw. `BEFORE UPDATE`-Trigger zusammenfassen.
2. **Code-Duplizierung.** `acquireLockWithVersion` ist wegen „No Local Imports" in mehrere Funktionen inline kopiert. → **Empfehlung:** Bei Migration durch echten Import / DB-Funktion ersetzen (Single Source of Truth).
3. **SSE-Skalierung.** Jeder Client öffnet eigene Subscriptions; in Serverless-Umgebungen begrenzt skalierbar. → **Empfehlung:** Mittelfristig nativen Realtime-Provider oder Multiplexer einsetzen.
4. **E-Mail als Sperr-Identität.** Sperr-Inhaber wird per E-Mail (veränderliche PII) referenziert. → **Empfehlung:** Auf stabile User-UUID umstellen.
5. **Restpunkt §7.3** abschließen (Status-Check auf Service-Rolle).

---

## 9. Beteiligte Komponenten (Referenz)

**Backend-Funktionen:**
`acquireLockSecure`, `acquireUnitLockSecure`, `lockTaskSecure`, `lockProjectTaskSecure`, `checkLockSecure`, `releaseLernpaketLockSecure`, `releaseLockSecure`, `releaseStructuralLockSecure`, `releaseLockSimple`, `forceReleaseLockAdmin`, `forceReleaseTaskLockAdmin`, `lockReaper`, `sseUpdates`, `utils/occLockUtils`.

**Frontend:**
`hooks/useLocks.js` (zentrale Engine), `hooks/useRealtimeUpdates.js`, `hooks/useStructuralLock.js`.

**Dokumentation:**
`BACKEND_SECURITY_ARCHITECTURE.md`, `HIERARCHICAL_LOCKING_VERIFICATION.md`, `OPTIMISTIC_LOCKING_VERSION_FIELD.md`, `LERNPAKET_LOCK_AUDIT_REPORT_2026_04_22.md`.

---

*Ende des Berichts.*