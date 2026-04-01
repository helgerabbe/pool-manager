# Backend Security Architecture: RBAC & Cascade Delete
**Phase 6 - Kritische Sicherheitshärtung**

---

## 🎯 Architektur-Übersicht

### Single Source of Truth Prinzip
```
Frontend Request → Backend RBAC Gate → Authorization Check → Entity Operation → Response
                        ↓
                   Keine Umgehung möglich (DevTools können API nicht bypassen)
```

### Design Patterns
- **RBAC Gateway:** Jede Mutation validiert Berechtigungen serverseitig
- **Cascade Delete via Backend:** Ein Delete-Request, transaktionale Cleanup
- **Audit Trail:** Jede Operation wird geloggt mit User + Timestamp
- **Idempotency Keys:** Verhindert doppelte Deletes

---

## 1. RBAC-MIDDLEWARE ARCHITEKTUR

### 1.1 Authentication Context
```typescript
interface AuthContext {
  userId: string;           // User Email
  role: string;            // "Administrator" | "Fachschaftsleitung" | "Fachlehrkraft" | "Betrachter"
  subjects: string[];      // Zuständige Fächer ["Deutsch", "Mathematik"]
  timestamp: number;       // Token Issue Time
}
```

### 1.2 RBAC Rules Matrix

```typescript
type Operation = "CREATE" | "UPDATE" | "DELETE" | "PUBLISH";
type ResourceType = "Einheit" | "Themenfeld" | "Lernpaket" | "Lernziel" | "Aufgabe" | "Basismodul";

interface RBACRule {
  role: string;
  resource: ResourceType;
  operation: Operation;
  conditions?: {
    mustOwnSubject?: boolean;      // User muss das Fach in seiner Liste haben
    mustBeCreator?: boolean;        // User muss Ersteller sein
    cannotPublish?: boolean;        // Keine Freigabe erlaubt
    mustBeUnitLead?: boolean;       // EinheitMembers.unit_role === "LEITUNG"
  };
}

const RBAC_MATRIX: RBACRule[] = [
  // Administrator: Alles darf
  { role: "Administrator", resource: "Einheit", operation: "CREATE" },
  { role: "Administrator", resource: "Einheit", operation: "UPDATE" },
  { role: "Administrator", resource: "Einheit", operation: "DELETE" },
  { role: "Administrator", resource: "Einheit", operation: "PUBLISH" },

  // Fachschaftsleitung: Kann ihre Fächer verwalten
  {
    role: "Fachschaftsleitung",
    resource: "Einheit",
    operation: "CREATE",
    conditions: { mustOwnSubject: true }
  },
  {
    role: "Fachschaftsleitung",
    resource: "Einheit",
    operation: "UPDATE",
    conditions: { mustOwnSubject: true }
  },
  {
    role: "Fachschaftsleitung",
    resource: "Einheit",
    operation: "DELETE",
    conditions: { mustOwnSubject: true }
  },
  {
    role: "Fachschaftsleitung",
    resource: "Einheit",
    operation: "PUBLISH",
    conditions: { mustOwnSubject: true }
  },

  // Fachlehrkraft: Kann Einheiten bearbeiten, bei denen sie Mitglied ist
  {
    role: "Fachlehrkraft",
    resource: "Einheit",
    operation: "UPDATE",
    conditions: { mustBeUnitLead: true }
  },
  {
    role: "Fachlehrkraft",
    resource: "Lernpaket",
    operation: "CREATE",
    conditions: { mustBeUnitLead: true }
  },

  // Betrachter: Keine Schreibzugriffe
  // (implizit alle anderen Operationen denied)
];
```

### 1.3 RBAC-Evaluation Function

```typescript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function evaluateRBAC(
  req: Request,
  resource: ResourceType,
  operation: Operation,
  targetEntity?: any  // Die Entity die verändert wird
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return { allowed: false, reason: "Unauthenticated" };
    }

    // User-Details aus Benutzer Entity abrufen
    const benutzer = await base44.entities.Benutzer.filter({ user_id: user.email });
    if (!benutzer || benutzer.length === 0) {
      return { allowed: false, reason: "User not registered" };
    }

    const userRecord = benutzer[0];
    const role = userRecord.rolle;
    const subjects = userRecord.fachbereich_zustaendigkeit || [];

    // RBAC Rule suchen
    const rule = RBAC_MATRIX.find(
      (r) => r.role === role && r.resource === resource && r.operation === operation
    );

    if (!rule) {
      return { allowed: false, reason: `No permission: ${role} cannot ${operation} ${resource}` };
    }

    // Conditions prüfen
    if (rule.conditions?.mustOwnSubject && targetEntity?.fach) {
      if (!subjects.includes(targetEntity.fach)) {
        return { allowed: false, reason: `User not responsible for subject: ${targetEntity.fach}` };
      }
    }

    if (rule.conditions?.mustBeCreator && targetEntity?.created_by !== user.email) {
      return { allowed: false, reason: "User is not the creator" };
    }

    if (rule.conditions?.mustBeUnitLead && targetEntity?.einheit_id) {
      const membership = await base44.entities.EinheitMembers.filter({
        einheit_id: targetEntity.einheit_id,
        user_email: user.email,
      });

      if (!membership || membership.length === 0 || membership[0].unit_role !== "LEITUNG") {
        return { allowed: false, reason: "User must be unit lead" };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error("RBAC evaluation error:", error);
    return { allowed: false, reason: "RBAC evaluation failed" };
  }
}
```

---

## 2. SECURE UPDATE/DELETE PATTERN

### 2.1 Protected Update Wrapper

```typescript
async function protectedUpdate(
  req: Request,
  entityName: string,
  entityId: string,
  updateData: any
): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Existing entity abrufen
    const currentEntity = await base44.asServiceRole.entities[entityName].get(entityId);
    if (!currentEntity) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // 2. RBAC prüfen (mit updated entity data)
    const merged = { ...currentEntity, ...updateData };
    const rbacCheck = await evaluateRBAC(req, entityName, "UPDATE", merged);
    if (!rbacCheck.allowed) {
      return Response.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // 3. Update durchführen
    const updated = await base44.entities[entityName].update(entityId, updateData);

    // 4. Audit Log
    await logAuditEvent({
      user: user.email,
      action: "UPDATE",
      resource: entityName,
      resourceId: entityId,
      changes: updateData,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    console.error("Protected update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 2.2 Protected Delete Pattern

```typescript
async function protectedDelete(
  req: Request,
  entityName: string,
  entityId: string
): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Entity abrufen
    const entity = await base44.asServiceRole.entities[entityName].get(entityId);
    if (!entity) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // 2. RBAC prüfen
    const rbacCheck = await evaluateRBAC(req, entityName, "DELETE", entity);
    if (!rbacCheck.allowed) {
      return Response.json({ error: rbacCheck.reason }, { status: 403 });
    }

    // 3. Delete durchführen (mit Cascade)
    const deletedCount = await cascadeDelete(base44, entityName, entityId);

    // 4. Audit Log
    await logAuditEvent({
      user: user.email,
      action: "DELETE",
      resource: entityName,
      resourceId: entityId,
      affected: deletedCount,
      timestamp: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      deletedCount,
      message: `${entityName} and ${deletedCount - 1} related entities deleted`,
    });
  } catch (error) {
    console.error("Protected delete error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## 3. CASCADE DELETE IMPLEMENTATION

### 3.1 Dependency Graph

```typescript
interface DeleteDependency {
  entity: string;
  filterBy: string;  // z.B. "lernpaket_id" wenn parent = Lernpaket
}

const CASCADE_DELETE_RULES: Record<string, DeleteDependency[]> = {
  // Einheit löschen → Themenfelder, Lernpakete, Basismodule löschen
  Einheiten: [
    { entity: "Themenfeld", filterBy: "einheit_id" },
    { entity: "AllgemeineAufgabe", filterBy: "einheit_id" },
  ],

  // Themenfeld löschen → Lernpakete löschen
  Themenfeld: [
    { entity: "Lernpakete", filterBy: "themenfeld_id" },
  ],

  // Lernpaket löschen → Lernziele, Aufgabenbausteine, Aktivitäten löschen
  Lernpakete: [
    { entity: "Lernziele", filterBy: "lernpaket_id" },
    { entity: "Aufgabenbausteine", filterBy: "lernpaket_id" },
    { entity: "LernpaketAktivitaet", filterBy: "lernpaket_id" },
  ],

  // Lernziel löschen → Mappings entfernen
  Lernziele: [
    { entity: "AllgemeineAufgabeLernzielMapping", filterBy: "lernziel_id" },
    { entity: "MappingAufgabeBasisziel", filterBy: "basisziel_id" },
  ],

  // Aufgabe löschen → Mappings entfernen
  Aufgabenbausteine: [
    { entity: "MappingAufgabeBasisziel", filterBy: "aufgabe_id" },
  ],

  AllgemeineAufgabe: [
    { entity: "AllgemeineAufgabeLernzielMapping", filterBy: "aufgabe_id" },
  ],

  // EinheitMember löschen → Keine Abhängigkeiten
  EinheitMembers: [],
};
```

### 3.2 Cascade Delete Function

```typescript
async function cascadeDelete(
  base44,
  entityName: string,
  entityId: string,
  deletedCount: number = 1,
  deletedEntities: Map<string, number> = new Map()
): Promise<number> {
  // Avoid infinite loops
  const key = `${entityName}:${entityId}`;
  if (deletedEntities.has(key)) {
    return deletedCount;
  }
  deletedEntities.set(key, 1);

  // Get cascade rules for this entity
  const dependencies = CASCADE_DELETE_RULES[entityName] || [];

  // 1. Delete all dependent entities
  for (const dep of dependencies) {
    try {
      // Find all entities that reference the parent
      const dependent = await base44.asServiceRole.entities[dep.entity].filter({
        [dep.filterBy]: entityId,
      });

      // Recursively delete dependencies
      for (const item of dependent) {
        deletedCount += await cascadeDelete(
          base44,
          dep.entity,
          item.id,
          deletedCount,
          deletedEntities
        );
      }
    } catch (error) {
      console.error(`Error deleting ${dep.entity} for ${entityName}:${entityId}`, error);
      // Continue with next dependency instead of failing
    }
  }

  // 2. Delete the parent entity itself
  try {
    await base44.asServiceRole.entities[entityName].delete(entityId);
    console.log(`Deleted ${entityName}:${entityId}`);
  } catch (error) {
    console.error(`Failed to delete ${entityName}:${entityId}`, error);
    throw new Error(`Cascade delete failed for ${entityName}:${entityId}`);
  }

  return deletedCount;
}
```

---

## 4. AUDIT TRAIL IMPLEMENTATION

### 4.1 AuditLog Entity Schema

```json
{
  "name": "AuditLog",
  "type": "object",
  "properties": {
    "user_email": {
      "type": "string",
      "description": "Email des Users der die Action durchführte"
    },
    "action": {
      "type": "string",
      "enum": ["CREATE", "UPDATE", "DELETE", "PUBLISH", "EXPORT"],
      "description": "Aktion die durchgeführt wurde"
    },
    "resource_type": {
      "type": "string",
      "description": "Typ der Entität (Einheit, Lernpaket, etc)"
    },
    "resource_id": {
      "type": "string",
      "description": "ID der betroffenen Entität"
    },
    "changes": {
      "type": "object",
      "description": "Bei UPDATE: Was wurde geändert",
      "additionalProperties": true
    },
    "affected_count": {
      "type": "number",
      "description": "Bei Cascade Delete: Wie viele Entities gelöscht"
    },
    "ip_address": {
      "type": "string",
      "description": "IP des Clients"
    },
    "status": {
      "type": "string",
      "enum": ["success", "failed"],
      "description": "Erfolg der Operation"
    },
    "error_message": {
      "type": "string",
      "description": "Falls Status = failed"
    }
  },
  "required": ["user_email", "action", "resource_type", "resource_id", "status"]
}
```

### 4.2 Audit Logging Function

```typescript
async function logAuditEvent(base44, event: {
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: any;
  affectedCount?: number;
  status: "success" | "failed";
  errorMessage?: string;
}): Promise<void> {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      user_email: event.user,
      action: event.action,
      resource_type: event.resource,
      resource_id: event.resourceId,
      changes: event.changes || null,
      affected_count: event.affectedCount || 1,
      status: event.status,
      error_message: event.errorMessage || null,
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
    // Nicht throwen - Logging darf Operations nicht blockieren
  }
}
```

---

## 5. IMPLEMENTATION IN CUSTOM BACKEND FUNCTIONS

### 5.1 Protected Create Endpoint

```typescript
// functions/createEinheitSecure.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { titel_der_einheit, fach, jahrgangsstufe, gesamtziel } = body;

    // Validierung
    if (!titel_der_einheit || !fach || !jahrgangsstufe) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // RBAC: User muss Zuständigkeit für dieses Fach haben
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    if (!benutzer || benutzer.length === 0) {
      return Response.json({ error: "User not registered" }, { status: 403 });
    }

    const userRecord = benutzer[0];
    if (!userRecord.fachbereich_zustaendigkeit?.includes(fach)) {
      return Response.json(
        {
          error: `You are not responsible for subject: ${fach}`,
          allowed_subjects: userRecord.fachbereich_zustaendigkeit,
        },
        { status: 403 }
      );
    }

    // Create
    const newEinheit = await base44.entities.Einheiten.create({
      titel_der_einheit,
      fach,
      jahrgangsstufe,
      gesamtziel: gesamtziel || "",
      freigabe_status: "In Planung",
    });

    // Audit
    await logAuditEvent(base44, {
      user: user.email,
      action: "CREATE",
      resource: "Einheiten",
      resourceId: newEinheit.id,
      changes: { titel_der_einheit, fach, jahrgangsstufe },
      status: "success",
    });

    return Response.json({ success: true, data: newEinheit });
  } catch (error) {
    console.error("Create einheit error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### 5.2 Protected Delete Endpoint (mit Cascade)

```typescript
// functions/deleteEinheitSecure.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  if (req.method !== "DELETE") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const einheitId = url.searchParams.get("id");

    if (!einheitId) {
      return Response.json({ error: "Missing id parameter" }, { status: 400 });
    }

    // Get einheit
    const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
    if (!einheit) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // RBAC: User muss Zuständigkeit für dieses Fach haben
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter({
      user_id: user.email,
    });

    if (!benutzer || benutzer.length === 0) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userRecord = benutzer[0];
    if (!userRecord.fachbereich_zustaendigkeit?.includes(einheit.fach)) {
      return Response.json(
        { error: "You are not responsible for this subject" },
        { status: 403 }
      );
    }

    // Cascade Delete
    let deletedCount = 0;
    try {
      deletedCount = await cascadeDelete(base44, "Einheiten", einheitId);
    } catch (error) {
      // Log failed attempt
      await logAuditEvent(base44, {
        user: user.email,
        action: "DELETE",
        resource: "Einheiten",
        resourceId: einheitId,
        status: "failed",
        errorMessage: error.message,
      });

      return Response.json(
        { error: "Cascade delete failed: " + error.message },
        { status: 500 }
      );
    }

    // Audit success
    await logAuditEvent(base44, {
      user: user.email,
      action: "DELETE",
      resource: "Einheiten",
      resourceId: einheitId,
      affectedCount: deletedCount,
      status: "success",
    });

    return Response.json({
      success: true,
      message: `Einheit and ${deletedCount - 1} dependent entities deleted`,
      deletedCount,
    });
  } catch (error) {
    console.error("Delete einheit error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

## 6. FRONTEND INTEGRATION

### 6.1 Adapter Pattern (Frontend nutzt Secure Endpoints)

```typescript
// api/secureApi.ts
import { base44 } from '@/api/base44Client';

export const secureApi = {
  // Statt direkt base44.entities.Einheiten.create()
  async createEinheit(data: any) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/functions/createEinheitSecure`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        }
      );

      if (response.status === 403) {
        throw new Error("You are not authorized for this action");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to create einheit:", error);
      throw error;
    }
  },

  async deleteEinheit(id: string) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/functions/deleteEinheitSecure?id=${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.status === 403) {
        throw new Error("You are not authorized to delete this unit");
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to delete einheit:", error);
      throw error;
    }
  },
};
```

---

## 7. TESTING STRATEGY

### 7.1 RBAC Test Cases

```typescript
// tests/rbac.test.ts
describe("RBAC Authorization", () => {
  it("should deny Fachlehrkraft from creating Einheit without subject", async () => {
    // User: Fachlehrkraft, subjects: ["Deutsch"]
    // Try: CREATE Einheit with fach="Mathematik"
    // Expected: 403 Forbidden
  });

  it("should allow Fachschaftsleitung to update their subject Einheit", async () => {
    // User: Fachschaftsleitung, subjects: ["Deutsch", "Englisch"]
    // Try: UPDATE Einheit with fach="Deutsch"
    // Expected: 200 Success
  });

  it("should deny Betrachter from any write operation", async () => {
    // User: Betrachter
    // Try: CREATE/UPDATE/DELETE any entity
    // Expected: 403 Forbidden
  });

  it("should deny frontend bypass attempts", async () => {
    // Simulate: curl -X DELETE /entities/Einheiten/123 -H "Auth: invalid"
    // Expected: 403 Forbidden
  });
});
```

### 7.2 Cascade Delete Test Cases

```typescript
describe("Cascade Delete", () => {
  it("should delete Einheit and all Themenfelder", async () => {
    // Setup: Einheit with 3 Themenfelder
    // Action: DELETE Einheit
    // Expected: 4 entities deleted (1 Einheit + 3 Themenfelder)
  });

  it("should delete Lernpaket and all Lernziele, Aufgabenbausteine, Mappings", async () => {
    // Setup: Complex tree
    // Action: DELETE Lernpaket
    // Expected: All orphaned records cleaned up
  });

  it("should rollback on error", async () => {
    // Setup: Lernpaket with special constraint violation
    // Action: DELETE Lernpaket (fails mid-cascade)
    // Expected: Transaction rolled back, no partial deletes
  });
});
```

---

## 8. DEPLOYMENT CHECKLIST

- [ ] AuditLog Entity erstellt
- [ ] Backend RBAC Middleware implementiert
- [ ] Cascade Delete Rules vollständig definiert
- [ ] Secure Delete Function deployed
- [ ] Secure Create/Update Functions deployed
- [ ] Alle Entity Operations geprüft (sind noch direkt erreichbar?)
- [ ] RBAC Tests bestanden
- [ ] Cascade Delete Tests bestanden
- [ ] Frontend auf neue Endpoints umgestellt
- [ ] Error Messages getestet (403 korrekt?)
- [ ] Audit Log überprüft (Entries vorhanden?)
- [ ] Production Rollout Plan

---

## 9. HÄRTUNGS-ROADMAP

### Phase 6.1 (Diese Woche)
1. ✅ Audit dokumentiert
2. ⏳ AuditLog Entity in Base44 hinzufügen
3. ⏳ Backend RBAC Middleware schreiben
4. ⏳ Cascade Delete für kritische Entities (Einheiten)

### Phase 6.2 (Nächste Woche)
5. ⏳ Alle Entity Operations sichern
6. ⏳ Frontend auf Secure Endpoints umstellen
7. ⏳ Tests durchführen
8. ⏳ Production Deployment

### Phase 6.3 (Später)
9. ⏳ Realtime RBAC Invalidation
10. ⏳ Advanced Audit Reports
11. ⏳ Compliance Export (DSGVO)