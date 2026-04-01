# Integration des deleteEinheitSecure Endpoints

## 1. Frontend API Adapter (✅ Bereits erstellt)

**Datei:** `src/api/secureApi.js`

```javascript
import { secureApi } from '@/api/secureApi';

// Verwendung:
try {
  const result = await secureApi.deleteEinheit(einheitId);
  console.log(`${result.deleted_count} records deleted`);
} catch (error) {
  if (error.isForbidden()) {
    toast.error('Keine Berechtigung zum Löschen');
  } else if (error.isNotFound()) {
    toast.error('Einheit nicht gefunden');
  } else {
    toast.error(error.message);
  }
}
```

---

## 2. Integration in WorkspaceDetailPanel (EinheitPanel Delete Button)

**Wo:** `components/workspace/WorkspaceDetailPanel.jsx` im `EinheitPanel` Component

**Aktuell (Zeile 246-250):**
```javascript
{kannBearbeiten && (
  <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
    <Edit className="w-4 h-4" /> Bearbeiten
  </Button>
)}
```

**Gewünscht:** Zusätzlich einen Delete Button (aber das macht normalerweise die Parent-Komponente)

---

## 3. Integration in Parent (Workspace.jsx)

**Die Delete-Mutation sollte sein:**

```javascript
import { secureApi } from '@/api/secureApi';
import { toast } from 'sonner';

const deleteEinheit = useMutation({
  mutationFn: async (einheitId) => {
    try {
      return await secureApi.deleteEinheit(einheitId);
    } catch (error) {
      // SecureApiError hat .isForbidden(), .isNotFound(), .isUnauthorized()
      if (error.isForbidden()) {
        throw new Error(`Keine Berechtigung: ${error.message}`);
      } else if (error.isUnauthorized()) {
        throw new Error('Bitte melden Sie sich an');
      } else {
        throw error;
      }
    }
  },
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    // Auch andere caches invalidieren da cascade delete passiert
    queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['lernziele'] });
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
    
    toast.success(`Einheit und ${result.deleted_count} abhängige Datensätze gelöscht`);
    // Navigation zur Einheiten-Liste
    navigate('/einheiten');
  },
  onError: (error) => {
    // Wichtig: KEIN optimistic UI update rückgängig machen wenn 403
    // Die Einheit sollte bereits nicht aus der Liste entfernt sein
    toast.error(error.message);
  },
});

// In der UI:
const handleDeleteEinheit = async () => {
  const confirmed = window.confirm(
    `Möchten Sie die Einheit "${einheit.titel_der_einheit}" wirklich löschen? ` +
    `Alle ${lernpakete.length} Lernpakete und deren Inhalte werden ebenfalls gelöscht.`
  );
  
  if (confirmed) {
    deleteEinheit.mutate(einheit.id);
  }
};
```

---

## 4. Test-Szenarien

### Szenario A: Administrator löscht Einheit ✅
```
1. Admin klickt Delete Button
2. 403 kommt NICHT → Operation erfolgreich
3. Toast: "Einheit und 15 abhängige Datensätze gelöscht"
4. Navigation zu /einheiten
```

### Szenario B: Fachschaftsleitung löscht Einheit (falsches Fach) ❌
```
1. User (Fachschaftsleitung) für Mathematik ist für Deutsch-Einheit nicht zuständig
2. 403 kommt mit Reason: "Not responsible for subject: Deutsch"
3. Toast: "Keine Berechtigung: Not responsible for subject: Deutsch"
4. Einheit bleibt in der Liste (kein optimistic update)
5. AuditLog: { status: "failed", errorMessage: "..." }
```

### Szenario C: Fachlehrkraft ist nicht Unit Lead ❌
```
1. User (Fachlehrkraft) klickt Delete
2. 403 kommt mit Reason: "Must be unit lead to delete"
3. Toast: "Keine Berechtigung: Must be unit lead to delete"
4. AuditLog: { status: "failed", errorMessage: "..." }
```

### Szenario D: Betrachter versucht zu löschen ❌
```
1. User (Betrachter) hat Delete Button nicht sichtbar (UI)
2. Falls doch gecallt: 403 kommt
3. AuditLog: { status: "failed", errorMessage: "Role Betrachter cannot delete" }
```

---

## 5. Wichtige Hinweise

### Non-blocking Audit Logging
- Fehler beim AuditLog.create() blockieren die Operation NICHT
- Wenn AuditLog fehler hat, wird es nur geloggt (console.error)
- Operation geht weiter

### Cascade Delete Tiefe
- Max Depth: 10 (verhindert infinite loops)
- Reihenfolge: Children zuerst, dann Parent
- Betroffene Entities: Themenfeld, Lernpakete, Lernziele, Aufgabenbausteine, MappingAufgabeBasisziel, EinheitMembers

### RBAC Checks
- RBAC wird VOR Cascade Delete gemacht
- Wenn 403, wird DELETE-Operation nie ausgeführt
- Wenn 200, ist DELETE garantiert erfolgreich (bei normalen Umständen)

### Error Handling
```javascript
try {
  const result = await secureApi.deleteEinheit(id);
} catch (error) {
  if (error.isForbidden()) {      // 403
    // RBAC check failed
  } else if (error.isNotFound()) { // 404
    // Einheit existiert nicht
  } else if (error.isUnauthorized()) { // 401
    // User nicht eingeloggt
  } else {
    // 500 oder Network error
  }
}
```

---

## 6. Nächste Schritte (Phase 6.3)

Nach dem Testing können weitere Endpoints implementiert werden:

- [ ] `createEinheitSecure.js` - CREATE mit RBAC
- [ ] `updateEinheitSecure.js` - UPDATE mit RBAC
- [ ] `deleteThemenfeldSecure.js` - DELETE Themenfeld mit Cascade
- [ ] `deleteLernpaketSecure.js` - DELETE Lernpaket mit Cascade
- [ ] Weitere Updates für Lernziele, Aufgabenbausteine

---

## 7. Audit Trail Beispiel

Nach erfolgreichem Delete:

```json
{
  "id": "uuid-audit-123",
  "user_email": "teacher@school.de",
  "action": "DELETE",
  "resource_type": "Einheiten",
  "resource_id": "uuid-einheit-456",
  "affected_count": 15,
  "status": "success",
  "error_message": null,
  "created_date": "2026-04-01T14:30:00Z",
  "created_by": "system"
}
```

Nach fehlgeschlagenem Delete:

```json
{
  "id": "uuid-audit-124",
  "user_email": "teacher@school.de",
  "action": "DELETE",
  "resource_type": "Einheiten",
  "resource_id": "uuid-einheit-456",
  "affected_count": 1,
  "status": "failed",
  "error_message": "Not responsible for subject: Deutsch",
  "created_date": "2026-04-01T14:35:00Z",
  "created_by": "system"
}
``