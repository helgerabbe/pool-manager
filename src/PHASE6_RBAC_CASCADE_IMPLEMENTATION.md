# Phase 6: RBAC & Cascade Delete Implementation Guide

**Zielstellung:** Behebung kritischer Sicherheitsprobleme #1 (Cascade Delete) und #3 (Backend RBAC)

---

## 📋 CHECKLIST: Schritt-für-Schritt Implementation

### Schritt 1: AuditLog Entity einrichten ✅
- [x] Datei erstellt: `entities/AuditLog.json`
- [ ] Entity im Base44 Dashboard hinzufügen: Dashboard → Admin → Entities → Create
- [ ] Feld `created_date` sollte automatisch gesetzt werden
- **Verifikation:** In Dashboard sollte AuditLog unter Entities erscheinen

---

### Schritt 2: Backend Funktionen deployen ✅
- [x] Datei erstellt: `functions/deleteEinheitWithCascade.js`
- [ ] Weitere Delete Funktionen anlegen für:
  - [ ] `functions/deleteLernpaketWithCascade.js`
  - [ ] `functions/deleteThemenfeldWithCascade.js`
  - [ ] `functions/deleteAllgemeineAufgabeWithCascade.js`
- [ ] Secure Update Funktionen für alle kritischen Entities
- **Verifikation:** Funktionen sollten im Dashboard → Code → Functions erscheinen

---

### Schritt 3: RBAC Middleware in Funktionen integrieren

Für JEDE Mutation müssen diese Checks eingebaut werden:

```javascript
// Template für alle CREATE/UPDATE/DELETE Funktionen:

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // 1. USER LOOKUP
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });
    if (!benutzer || !benutzer[0]) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userRecord = benutzer[0];
    const role = userRecord.rolle;
    const subjects = userRecord.fachbereich_zustaendigkeit || [];

    // 2. PERMISSION CHECK (Beispiel für Fachschaftsleitung)
    if (role === "Betrachter") {
      return Response.json({ error: "No permission" }, { status: 403 });
    }

    if (role === "Fachschaftsleitung") {
      // Entity hat fach Feld?
      if (targetEntity?.fach && !subjects.includes(targetEntity.fach)) {
        return Response.json({ error: "Not responsible for this subject" }, { status: 403 });
      }
    }

    // 3. OPERATION
    const result = await base44.entities.SomeEntity.create(data);

    // 4. AUDIT LOG
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        user_email: user.email,
        action: "CREATE",
        resource_type: "SomeEntity",
        resource_id: result.id,
        status: "success",
      });
    } catch (auditErr) {
      console.error("Audit error:", auditErr);
      // Nicht werfen - Logging darf nicht operation blockieren
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

### Schritt 4: Frontend anpassen - Neue Endpoints nutzen

**VORHER (unsicher):**
```javascript
// Frontend ruft direkt Entity API auf
const deleted = await base44.entities.Einheiten.delete(id);
```

**NACHHER (sicher):**
```javascript
// Frontend nutzt Secure Backend Endpoint
const response = await fetch(
  `/functions/deleteEinheitWithCascade?id=${id}`,
  { method: 'DELETE', credentials: 'include' }
);

if (response.status === 403) {
  toast.error("Sie haben keine Berechtigung dazu.");
  return;
}

const result = await response.json();
if (!result.success) {
  toast.error(result.error || "Fehler beim Löschen");
  return;
}

toast.success(`${result.affected_count} Einträge gelöscht`);
```

---

### Schritt 5: Alle kritischen Entity Operations härtung

**Kritische Operations die gehärtet werden MÜSSEN:**

1. **DELETE Operations:**
   - [ ] deleteEinheitWithCascade ✅
   - [ ] deleteLernpaketWithCascade
   - [ ] deleteThemenfeldWithCascade
   - [ ] deleteAllgemeineAufgabeWithCascade
   - [ ] deleteLernzielWithCascade (kleiner, weniger Abhängigkeiten)

2. **PUBLISH Operations (Status Change):**
   - [ ] publishEinheit (nur Fachschaftsleitung des Faches)
   - [ ] publishBasismodul

3. **CREATE Operations:**
   - [ ] createEinheit (Subject Check)
   - [ ] createBasismodul (Subject Check)
   - [ ] createLernpaket (Parent Einheit Check)

4. **UPDATE Operations für kritische Felder:**
   - [ ] updateEinheitStatus (nur bei neuer Freigabe)
   - [ ] updateEinheitFach (nur Fachschaftsleitung)

---

## 🔐 RBAC Rules Reference

### Administrator (Rolle)
- ✅ CREATE/UPDATE/DELETE any entity
- ✅ PUBLISH Einheiten + Basismodule
- ✅ Kann jeden User Role zuweisen

### Fachschaftsleitung (Rolle)
- ✅ CREATE/UPDATE/DELETE nur für ihre Fächer (`fachbereich_zustaendigkeit`)
- ✅ PUBLISH nur für ihre Fächer
- ❌ Keine Operationen auf fremde Fächer

**Beispiel:**
```javascript
// User = Fachschaftsleitung, subjects = ["Deutsch", "Englisch"]
// Operation: DELETE Einheit mit fach="Mathematik"
// Ergebnis: ❌ 403 Forbidden "Not responsible for subject: Mathematik"

// Operation: UPDATE Einheit mit fach="Deutsch"
// Ergebnis: ✅ 200 Success
```

### Fachlehrkraft (Rolle)
- ✅ CREATE/UPDATE/DELETE nur an Einheiten wo sie LEITUNG ist
- ✅ Muss in `EinheitMembers` mit `unit_role="LEITUNG"` eingetragen sein
- ❌ Keine globalen Operationen

**Beispiel:**
```javascript
// User = Fachlehrkraft
// Check: Ist User in EinheitMembers mit einheit_id=X und unit_role="LEITUNG"?
// JA: ✅ Darf Lernpakete in dieser Einheit erstellen/ändern
// NEIN: ❌ 403 Forbidden "Must be unit lead"
```

### Betrachter (Rolle)
- ❌ Keine CREATE/UPDATE/DELETE erlaubt
- ✅ Nur READ
- Alle Write-Versuche → 403 Forbidden

---

## 🧪 Testing Strategy

### Unit Test: RBAC Checks

```javascript
// test_rbac.js - Mit HTTP Client testen

async function testRBACDeny() {
  // Setup: User mit rolle="Betrachter"
  // Action: POST /functions/createEinheit
  // Expected: 403 Forbidden

  const response = await fetch(
    `${BASE_URL}/functions/createEinheit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titel_der_einheit: "Test",
        fach: "Deutsch",
        jahrgangsstufe: "5"
      }),
      credentials: 'include' // Mit Auth Cookie
    }
  );

  console.assert(response.status === 403, "Should deny Betrachter");
}

async function testCascadeDelete() {
  // Setup: Einheit mit 3 Themenfeldern, 5 Lernpaketen
  const einheitId = "test-123";

  // Action: DELETE
  const response = await fetch(
    `/functions/deleteEinheitWithCascade?id=${einheitId}`,
    { method: 'DELETE', credentials: 'include' }
  );

  const result = await response.json();
  // Expected: deleted_count >= 9 (1 Einheit + 3 TF + 5 LP + Deps)
  console.assert(result.deleted_count >= 9, "Should cascade delete");
}
```

### Integration Test: Audit Trail

```javascript
// test_audit.js

async function testAuditLogging() {
  // 1. Führe Operation durch
  await fetch(`/functions/createEinheit`, {...});

  // 2. Prüfe AuditLog
  const auditEntries = await fetch(
    `/api/entities/AuditLog?filter={"action":"CREATE","resource_type":"Einheiten"}`
  );

  const logs = await auditEntries.json();
  console.assert(logs.length > 0, "Should have audit entry");
  console.assert(logs[0].user_email === "current@user.de", "Correct user");
  console.assert(logs[0].status === "success", "Marked as success");
}
```

---

## 🚀 Deployment Roadmap

### Tag 1: Setup
- [ ] AuditLog Entity im Base44 hinzufügen
- [ ] deleteEinheitWithCascade testen
- [ ] Frontend Test mit neuer API durchführen

### Tag 2: Andere Entities
- [ ] Weitere Delete Functions schreiben
- [ ] Alle mit RBAC härtung

### Tag 3: Rollout
- [ ] QA Testing durchführen
- [ ] Production Deployment
- [ ] Monitoring aktivieren

---

## ⚠️ Common Pitfalls

### Pitfall 1: Fehlende User Registration
```javascript
// ❌ FALSCH - Crashes wenn User nicht in Benutzer Entity
const subject = benutzer.fachbereich_zustaendigkeit[0];

// ✅ RICHTIG
const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
  user_id: user.email,
});
if (!benutzer || benutzer.length === 0) {
  return Response.json({ error: "Not registered" }, { status: 403 });
}
```

### Pitfall 2: Cascade Delete ohne Tiefe-Limit
```javascript
// ❌ FALSCH - Infinite Loop möglich
async function cascadeDelete(base44, entity, id) {
  // ... keine Tiefe-Prüfung
}

// ✅ RICHTIG
async function cascadeDelete(base44, entity, id, depth = 0) {
  if (depth > 10) throw new Error("Depth exceeded");
  // ...
}
```

### Pitfall 3: Audit Log blockiert Main Operation
```javascript
// ❌ FALSCH - Wenn AuditLog.create() fehlschlägt, wird ganze Operation fehlgeschlagen
await base44.entities.AuditLog.create({...});
return Response.json({ success: true });

// ✅ RICHTIG
try {
  await base44.asServiceRole.entities.AuditLog.create({...});
} catch (err) {
  console.error("Audit error (non-blocking):", err);
  // Nicht werfen - Logging ist nicht critical
}
return Response.json({ success: true });
```

---

## 📊 Monitoring & Verification

Nach Deployment prüfen:

1. **Audit Trail vorhanden?**
   ```javascript
   const recentLogs = await base44.entities.AuditLog.list('-created_date', 10);
   console.log("Recent audit entries:", recentLogs);
   ```

2. **403 Responses für unbefugte Zugriffe?**
   - Als Betrachter versuchen zu löschen → Should return 403
   - Als Fachlehrkraft in fremder Einheit bearbeiten → Should return 403

3. **Cascade Deletes funktionieren?**
   - Einheit mit Subentities löschen
   - Prüfen: `affected_count` zeigt korrekte Anzahl?
   - Prüfen: Alle Child Records wirklich gelöscht?

---

## 🎯 Success Criteria

- [x] AuditLog Entity existiert
- [x] deleteEinheitWithCascade deployed
- [ ] Alle Mutations durch RBAC geschützt
- [ ] Keine direkte Entity-API Nutzung vom Frontend für Writes
- [ ] 100% Audit Trail Coverage
- [ ] Alle Tests grün
- [ ] Zero Security Issues in Code Review