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
3. `acquireDashboardLockSecure`: First-Mover-Kommentar entfernen,
   Re-Read kann dann optional auf `verify.version > currentVersion`
   prüfen (zusätzliche Sicherheit).

---

## 6. Bekannte offene Punkte (Folge-Tickets)

- **End-to-End-Test** für die Race-Condition (siehe DoD-Checkbox oben).
- **Frontend-Resync**: Komponenten, die `einheit.version` lokal halten
  (v. a. `EinheitFormWithValidation`), sollten nach Server-Antworten
  den neuen Versions-Wert übernehmen, um unnötige 409-Konflikte beim
  nächsten Save zu vermeiden.
- **Lernpakete / Aufgabenbausteine**: aktuell ohne `version`-Feld.
  Falls dort später ähnliche Race-Conditions auftreten, separates
  Schema- + Function-Ticket aufmachen.