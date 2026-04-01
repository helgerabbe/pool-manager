# Phase 6.1: Security Utilities Deployment ✅

**Status:** Grundlagen implementiert und bereit für API-Endpoints

---

## 📦 Deployierte Komponenten

### 1. ✅ AuditLog Entity
**Datei:** `entities/AuditLog.json`

**JSON Schema:**
```json
{
  "name": "AuditLog",
  "type": "object",
  "properties": {
    "user_email": { "type": "string" },
    "action": { "type": "string", "enum": ["CREATE", "UPDATE", "DELETE", "PUBLISH", "EXPORT"] },
    "resource_type": { "type": "string" },
    "resource_id": { "type": "string" },
    "changes": { "type": "object", "additionalProperties": true },
    "affected_count": { "type": "number" },
    "ip_address": { "type": "string" },
    "status": { "type": "string", "enum": ["success", "failed"] },
    "error_message": { "type": "string" }
  },
  "required": ["user_email", "action", "resource_type", "resource_id", "status"]
}
```

**Automatische Felder:**
- `id` (UUID, autogeneriert)
- `created_date` (Timestamp, autogeneriert)
- `updated_date` (Timestamp, autogeneriert)
- `created_by` (User Email, autogeneriert)

**Verwendung:**
```javascript
const auditEntry = await base44.asServiceRole.entities.AuditLog.create({
  user_email: "teacher@school.de",
  action: "DELETE",
  resource_type: "Einheiten",
  resource_id: "uuid-123",
  affected_count: 5,
  status: "success"
});
```

---

### 2. ✅ Audit Logger Utility
**Datei:** `lib/auditLogger.js`

**Exported Functions:**
- `logAuditEvent(base44, event)` - Logging einer Aktion
- `getAuditHistory(base44, resourceType, resourceId)` - Retrieve Audit Trail für Entity
- `getUserAuditTrail(base44, userEmail, limit)` - Retrieve Audit Trail für User
- `getFailedOperations(base44, limit)` - Security Report

**Features:**
✅ Non-blocking Error Handling (Fehler blockieren Haupt-Operation nicht)
✅ Vollständige Validierung der Eingaben
✅ Automatische Logging in Console (`[AUDIT]` Prefix)
✅ Support für Batch-Operationen

**Import & Verwendung:**
```javascript
import { logAuditEvent } from '@/lib/auditLogger.js';

// Nach erfolgreicher Operation
await logAuditEvent(base44, {
  user: 'teacher@school.de',
  action: 'CREATE',
  resource: 'Einheiten',
  resourceId: newEinheit.id,
  changes: { titel: 'Neue Einheit', fach: 'Deutsch' },
  status: 'success'
});

// Bei Fehler
await logAuditEvent(base44, {
  user: 'teacher@school.de',
  action: 'DELETE',
  resource: 'Einheiten',
  resourceId: id,
  status: 'failed',
  errorMessage: 'User not responsible for subject'
});
```

---

### 3. ✅ RBAC Evaluator Utility
**Datei:** `lib/rbacEvaluator.js`

**Exported Functions:**
- `evaluateRBAC(req, resource, operation, targetEntity)` - Prüft Berechtigungen
- `findParentEinheit(base44, entityName, entity)` - Findet Parent Unit
- `evaluateRBACWithParent(req, entityName, operation, targetEntity)` - RBAC mit Parent Fallback
- `RBAC_MATRIX` - Konstante mit allen Regeln

**RBAC Matrix Struktur:**
```javascript
{
  Administrator: { allowAll: true },
  Fachschaftsleitung: {
    operations: {
      CREATE: ['Einheiten', 'Themenfeld', ...],
      UPDATE: ['Einheiten', 'Themenfeld', ...],
      DELETE: ['Einheiten', 'Themenfeld', ...],
      PUBLISH: ['Einheiten', 'Basismodule']
    },
    condition: 'mustOwnSubject'
  },
  Fachlehrkraft: {
    operations: {
      CREATE: ['Themenfeld', 'Lernpakete', ...],
      UPDATE: ['Themenfeld', 'Lernpakete', ...],
      DELETE: ['Themenfeld', 'Lernpakete', ...]
    },
    condition: 'mustBeUnitLead'
  },
  Betrachter: {
    operations: {},
    allowedReadOnly: true
  }
}
```

**Rückgabewert:**
```javascript
// Success
{ allowed: true }

// Failure mit Grund
{ allowed: false, reason: "Not responsible for subject: Mathematik" }
```

**Import & Verwendung:**
```javascript
import { evaluateRBAC } from '@/lib/rbacEvaluator.js';

const rbacCheck = await evaluateRBAC(
  req,
  'Einheiten',      // resource
  'DELETE',         // operation
  { id: '123', fach: 'Deutsch' }  // targetEntity
);

if (!rbacCheck.allowed) {
  return Response.json({ error: rbacCheck.reason }, { status: 403 });
}

// Operation durchführen
await base44.entities.Einheiten.delete(id);
```

---

## 🔗 Integration in Endpoints

### Template für sichere DELETE Endpoint

```javascript
// functions/deleteEinheitSecure.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { evaluateRBAC } from '@/lib/rbacEvaluator.js';
import { logAuditEvent } from '@/lib/auditLogger.js';

Deno.serve(async (req) => {
  if (req.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const einheitId = url.searchParams.get('id');

    if (!einheitId) {
      return Response.json({ error: 'Missing id' }, { status: 400 });
    }

    // 1. Get entity
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // 2. RBAC Check (!)
    const rbacCheck = await evaluateRBAC(req, 'Einheiten', 'DELETE', einheit);
    if (!rbacCheck.allowed) {
      await logAuditEvent(base44, {
        user: user.email,
        action: 'DELETE',
        resource: 'Einheiten',
        resourceId: einheitId,
        status: 'failed',
        errorMessage: rbacCheck.reason,
      });
      return Response.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // 3. Cascade Delete
    const deletedCount = await cascadeDelete(base44, 'Einheiten', einheitId);

    // 4. Audit Log Success
    await logAuditEvent(base44, {
      user: user.email,
      action: 'DELETE',
      resource: 'Einheiten',
      resourceId: einheitId,
      affectedCount: deletedCount,
      status: 'success',
    });

    return Response.json({
      success: true,
      deleted_count: deletedCount,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### Template für sichere CREATE Endpoint

```javascript
// functions/createEinheitSecure.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { evaluateRBAC } from '@/lib/rbacEvaluator.js';
import { logAuditEvent } from '@/lib/auditLogger.js';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { titel_der_einheit, fach, jahrgangsstufe, gesamtziel } = body;

    // 1. Input Validation
    if (!titel_der_einheit || !fach || !jahrgangsstufe) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. RBAC Check (for CREATE we check against the new entity data)
    const rbacCheck = await evaluateRBAC(req, 'Einheiten', 'CREATE', { fach });
    if (!rbacCheck.allowed) {
      await logAuditEvent(base44, {
        user: user.email,
        action: 'CREATE',
        resource: 'Einheiten',
        resourceId: 'NEW',
        status: 'failed',
        errorMessage: rbacCheck.reason,
      });
      return Response.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // 3. Create Entity
    const newEinheit = await base44.entities.Einheiten.create({
      titel_der_einheit,
      fach,
      jahrgangsstufe,
      gesamtziel: gesamtziel || '',
      freigabe_status: 'In Planung',
    });

    // 4. Audit Log Success
    await logAuditEvent(base44, {
      user: user.email,
      action: 'CREATE',
      resource: 'Einheiten',
      resourceId: newEinheit.id,
      changes: { titel_der_einheit, fach, jahrgangsstufe },
      status: 'success',
    });

    return Response.json({ success: true, data: newEinheit });
  } catch (error) {
    console.error('Create error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

## 🧪 Testing the Utilities

### Test RBAC Evaluator

```javascript
// Quick test in browser console or via API
const req = /* HTTP Request Object */;
const result = await evaluateRBAC(
  req,
  'Einheiten',
  'DELETE',
  { id: 'test-id', fach: 'Deutsch' }
);

console.log(result); 
// { allowed: true } oder { allowed: false, reason: "..." }
```

### Test Audit Logging

```javascript
// Check AuditLog entries
const logs = await base44.entities.AuditLog.filter({
  action: 'DELETE',
  status: 'success'
}, '-created_date', 10);

console.log('Recent deletes:', logs);
```

---

## 📋 Next Steps (Phase 6.2)

Mit den Utilities bereit können jetzt folgende Endpoints geschrieben werden:

### Priority 1 (Diese Woche)
- [ ] `deleteEinheitSecure.js` - DELETE Einheit mit Cascade
- [ ] `createEinheitSecure.js` - CREATE Einheit mit RBAC
- [ ] `updateEinheitSecure.js` - UPDATE Einheit

### Priority 2 (Nächste Woche)
- [ ] Weitere Delete Endpoints für Lernpakete, Themenfelder
- [ ] UPDATE Endpoints für kritische Entities
- [ ] PUBLISH Endpoints (Status Change)

### Priority 3 (Testing & Rollout)
- [ ] Alle Endpoints testen
- [ ] Frontend auf neue APIs umstellen
- [ ] Production Deployment

---

## ✅ Checklist Completion

- [x] AuditLog Entity Schema erstellt
- [x] auditLogger.js mit Non-Blocking Error Handling implementiert
- [x] rbacEvaluator.js mit kompletter RBAC Matrix implementiert
- [x] Beide Utilities in `lib/` bereitgestellt
- [x] Documentation mit Code Templates
- [ ] Erstes Endpoint (deleteEinheitSecure) implementieren
- [ ] Integration Tests durchführen
- [ ] Production Deployment

---

## 📞 Support

**Fragen bei Implementation?**
- Utilities sind importierbar: `import { logAuditEvent } from '@/lib/auditLogger.js'`
- Non-Blocking Error Handling: Fehler beim Logging blockieren Operation nicht
- RBAC ist stateless: Prüfung in jedem Endpoint, keine caching
- Audit Trail ist vollständig: Failures und Successes werden geloggt

Weitergehen mit Phase 6.2 wenn Utilities tested?