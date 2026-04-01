# Phase 6.3 - UI Integration Beispiel

## Vor (direkter SDK-Aufruf):

```javascript
// In EinheitSettingsModal.jsx oder EinheitForm.jsx

const handleSaveMetadata = async (formData) => {
  setIsSaving(true);
  try {
    // ❌ DIRECT SDK CALL - No RBAC, No Audit Log
    await base44.entities.Einheiten.update(einheit.id, formData);
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    localStorage.removeItem(`einheit-settings-${einheit.id}`);
    toast.success('Einheit gespeichert.');
  } catch (err) {
    toast.error('Fehler beim Speichern.');
  } finally {
    setIsSaving(false);
  }
};
```

## Nach (Sichere API mit RBAC & Audit):

```javascript
// In EinheitSettingsModal.jsx oder EinheitForm.jsx

import { secureApi } from '@/api/secureApi';
import { toast } from 'sonner';

const handleSaveMetadata = async (formData) => {
  setIsSaving(true);
  try {
    // ✅ SECURE API CALL - RBAC, Audit Log, Error Handling
    const result = await secureApi.updateEinheit(einheit.id, formData);
    
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    localStorage.removeItem(`einheit-settings-${einheit.id}`);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1500);
    toast.success('Einheit gespeichert.');
    
    // Optionally: navigate away
    // setTimeout(() => onOpenChange(false), 500);
  } catch (error) {
    if (error.isForbidden()) {
      toast.error(`Keine Berechtigung: ${error.message}`);
    } else if (error.isNotFound()) {
      toast.error('Einheit nicht gefunden.');
    } else {
      toast.error(`Fehler: ${error.message}`);
    }
  } finally {
    setIsSaving(false);
  }
};
```

---

## CREATE Beispiel (z. B. in EinheitCreateWizard.jsx):

```javascript
// Vorher:
const createEinheit = useMutation({
  mutationFn: (data) => base44.entities.Einheiten.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheiten'] }),
});

// Nachher:
import { secureApi } from '@/api/secureApi';

const createEinheit = useMutation({
  mutationFn: (data) => secureApi.createEinheit(data),
  onSuccess: (result) => {
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    toast.success(`Einheit "${result.data.titel_der_einheit}" erstellt.`);
  },
  onError: (error) => {
    if (error.isForbidden()) {
      toast.error(`Keine Berechtigung: ${error.message}`);
    } else {
      toast.error(`Fehler: ${error.message}`);
    }
  },
});

const handleCreateEinheit = (formData) => {
  createEinheit.mutate({
    titel_der_einheit: formData.titel,
    fach: formData.fach,
    jahrgangsstufe: formData.jahrgang,
    gesamtziel: formData.gesamtziel,
    freigabe_status: 'In Planung',
  });
};
```

---

## Wichtige Hinweise

### 1. Error Handling
```javascript
try {
  const result = await secureApi.updateEinheit(id, data);
} catch (error) {
  if (error.isForbidden()) {      // 403 - RBAC denied
    // "Keine Berechtigung: Not responsible for subject: Deutsch"
  } else if (error.isNotFound()) { // 404 - Entity doesn't exist
    // "Einheit not found"
  } else if (error.isUnauthorized()) { // 401 - Not logged in
    // Redirect to login
  } else {
    // 500 or network error
  }
}
```

### 2. Validierung
- CREATE: `titel_der_einheit`, `fach`, `jahrgangsstufe` sind Pflichtfelder
- UPDATE: Alle Felder sind optional, nur die gesendeten werden aktualisiert

### 3. RBAC Rules
- **Administrator**: Create/Update alle Einheiten
- **Fachschaftsleitung**: Nur für ihre Fächer (fachbereich_zustaendigkeit)
- **Fachlehrkraft**: Nur als LEITUNG der Einheit (für Update)
- **Betrachter**: Keine Create/Update (sollte im UI disabled sein)

### 4. Audit Trail
```json
{
  "user_email": "teacher@school.de",
  "action": "UPDATE",
  "resource_type": "Einheiten",
  "resource_id": "uuid-123",
  "changes": { "titel_der_einheit": "Neue Einheit", "freigabe_status": "Freigegeben für Moodle" },
  "status": "success"
}
```

---

## Files zu Aktualisieren

### EinheitSettingsModal.jsx
```javascript
// OLD:
const updateEinheit = useMutation({
  mutationFn: (data) => base44.entities.Einheiten.update(einheit.id, data),
  ...
});

// NEW:
import { secureApi } from '@/api/secureApi';

const updateEinheit = useMutation({
  mutationFn: (data) => secureApi.updateEinheit(einheit.id, data),
  ...
});
```

### EinheitCreateWizard.jsx
```javascript
// OLD:
const mutation = useMutation({
  mutationFn: (data) => base44.entities.Einheiten.create(data),
  ...
});

// NEW:
import { secureApi } from '@/api/secureApi';

const mutation = useMutation({
  mutationFn: (data) => secureApi.createEinheit(data),
  ...
});
```

---

## Test-Szenarien

### Szenario 1: Fachlehrkraft erstellt Einheit ✅
```
1. User (Fachlehrkraft) klickt "Neue Einheit"
2. Füllt: Titel, Deutsch, Jahrgang 8
3. createEinheitSecure.js prüft: rolle === 'Fachlehrkraft' → allowed
4. Einheit wird erstellt
5. AuditLog: { action: "CREATE", status: "success" }
```

### Szenario 2: Fachschaftsleitung versucht, Einheit für falsches Fach zu erstellen ❌
```
1. User (Fachschaftsleitung für Mathematik) versucht Deutsch-Einheit
2. createEinheitSecure.js prüft: subjects.includes('Deutsch') → false
3. 403 kommt mit: "Cannot create unit for subject: Deutsch..."
4. AuditLog: { action: "CREATE", status: "failed", error_message: "..." }
5. UI Toast: "Keine Berechtigung: Cannot create unit for subject: Deutsch..."
```

### Szenario 3: Betrachter klickt Update-Button ❌
```
1. UI sollte Update-Button nicht zeigen (kannBearbeiten === false)
2. Falls trotzdem gecallt: 403 kommt
3. AuditLog: { action: "UPDATE", status: "failed", error_message: "Role Betrachter cannot update units" }
```

---

## Rollout-Reihenfolge

1. ✅ Backend: `createEinheitSecure.js`, `updateEinheitSecure.js`
2. ✅ Frontend: `secureApi.js` erweitert
3. 🚧 UI: Mutations in Formularen ersetzen (EinheitSettingsModal, EinheitCreateWizard, etc.)
4. 🧪 Testing: Alle RBAC-Szenarien testen
5. 📋 Dokumentation aktualisieren