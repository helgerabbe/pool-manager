# Active-Rejection Pattern: Sichere UI für RBAC-Fehler

## Konzept

**Active-Rejection** ist ein UX-Pattern, bei dem sicherheitskritische Buttons IMMER sichtbar und klickbar bleiben, aber bei fehlenden Rechten ein klares Error-Toast-Feedback zeigen.

### Vorher (Bad ❌):
```javascript
// Button wird basierend auf Frontend-Role disabled
{kannBearbeiten && (
  <Button onClick={handleSave}>Speichern</Button>
)}

// Problem:
// 1. User sieht keinen Button → verwirrt, warum die Option weg ist
// 2. Asymmetrie: Frontend-Logik und Backend-Logik unterscheiden sich
// 3. Keine Audit-Trail für Zugriffs-Versuche
```

### Nachher (Good ✅):
```javascript
// Button ist IMMER sichtbar und klickbar
<Button onClick={handleSave} disabled={isPending}>
  Speichern
</Button>

// Bei Klick: Try-Catch → Backend prüft RBAC → 403 → Error-Toast
// Problem gelöst:
// 1. User versucht, sieht sofort das Feedback
// 2. Backend ist Source of Truth für RBAC
// 3. Alle Zugriffs-Versuche sind geloggt
```

---

## Implementierungs-Checklist

### ✅ 1. Hook-Level: `useSecureMutation`
```javascript
// utils/useSecureMutation.js
export function useSecureMutation({
  mutationFn,        // z.B. secureApi.updateEinheit
  onSuccess,         // Callback nach Backend-OK
  operationName,     // "Einheit aktualisieren" (für Toast)
  invalidateQueries, // ['einheiten'], ['lernpakete']
  showSuccessToast,  // true/false
}) {
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      // Invalidate caches
      // Show toast
      // Call onSuccess
    },
    onError: (error) => {
      // Parse error: 403 → "Keine Berechtigung: ..."
      // Show error toast IMMER
      // Keine UI-Änderung
    },
  });
}
```

### ✅ 2. Component-Level: Verwende Hook
```javascript
function EinheitSettingsModal({ einheit, onClose }) {
  const mutation = useSecureMutation({
    mutationFn: (data) => secureApi.updateEinheit(einheit.id, data),
    onSuccess: () => {
      onClose(); // Modal schließt nur nach SUCCESS
    },
    operationName: 'Einheit aktualisieren',
    invalidateQueries: [['einheiten']],
  });

  const handleSave = (formData) => {
    mutation.mutate(formData);
    // Keine UI-Änderung hier!
    // mutation.isPending → Show Loading State
    // mutation.isError → Toast wurde bereits angezeigt
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <Form onSubmit={handleSave}>
          {/* Form Fields */}
          <Button disabled={mutation.isPending}>
            {mutation.isPending ? 'Wird gespeichert…' : 'Speichern'}
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### ✅ 3. Error-Message: Backend → Toast (1:1)
```javascript
// Backend sendet (z.B. createEinheitSecure.js):
{
  status: 403,
  error: "Cannot create unit for subject: Deutsch. You are responsible for: Mathematik, Englisch"
}

// Frontend zeigt in Toast:
toast.error('Keine Berechtigung: Cannot create unit for subject: Deutsch. You are responsible for: Mathematik, Englisch')

// User versteht sofort, WARUM die Aktion blockiert wurde
```

---

## Code-Beispiele

### Beispiel 1: Update Mutation (Modal)

```javascript
// ✅ EinheitSettingsModal.jsx (mit Active-Rejection)

import { useSecureMutation } from '@/utils/useSecureMutation';
import { secureApi } from '@/api/secureApi';
import { useState } from 'react';

export default function EinheitSettingsModal({ einheit, onClose }) {
  const [formData, setFormData] = useState({
    titel_der_einheit: einheit.titel_der_einheit,
    fach: einheit.fach,
    jahrgangsstufe: einheit.jahrgangsstufe,
  });

  // ✅ useSecureMutation handles all RBAC errors
  const updateMutation = useSecureMutation({
    mutationFn: (data) => secureApi.updateEinheit(einheit.id, data),
    operationName: 'Einheit aktualisieren',
    invalidateQueries: [['einheiten'], ['workspace', einheit.id]],
    onSuccess: () => {
      // ✅ ONLY after successful backend call:
      onClose(); // Close modal
      // optionally: navigate away
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // ❌ NO Optimistic Update!
    // Just call mutation – onSuccess/onError handles rest
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={formData.titel_der_einheit}
            onChange={(e) => setFormData({ ...formData, titel_der_einheit: e.target.value })}
            placeholder="Einheits-Titel"
          />
          <select
            value={formData.fach}
            onChange={(e) => setFormData({ ...formData, fach: e.target.value })}
          >
            <option value="">Fach wählen</option>
            <option value="Deutsch">Deutsch</option>
            <option value="Mathematik">Mathematik</option>
          </select>

          {/* ✅ Button is ALWAYS visible and clickable */}
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Wird gespeichert…' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Beispiel 2: Delete Mutation (mit Confirmation)

```javascript
// ✅ DeleteEinheitDialog.jsx (mit Active-Rejection)

import { useSecureMutation } from '@/utils/useSecureMutation';
import { secureApi } from '@/api/secureApi';
import { useState } from 'react';

export default function DeleteEinheitDialog({ einheit, onSuccess }) {
  const [open, setOpen] = useState(false);

  // ✅ useSecureMutation handles 403/404/500
  const deleteMutation = useSecureMutation({
    mutationFn: () => secureApi.deleteEinheit(einheit.id),
    operationName: 'Einheit löschen',
    invalidateQueries: [['einheiten']],
    showSuccessToast: true,
    successMessage: `Einheit "${einheit.titel_der_einheit}" gelöscht.`,
    onSuccess: () => {
      setOpen(false); // Close confirmation dialog
      // optionally: navigate away
      if (onSuccess) onSuccess();
    },
  });

  const handleConfirmDelete = () => {
    // ❌ NO: setOpen(false) here!
    // Only call mutation – it handles the rest
    deleteMutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {/* ✅ Delete button is ALWAYS visible */}
        <Button variant="destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          Löschen
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Einheit löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            "{einheit.titel_der_einheit}" wird gelöscht (inkl. alle Lernpakete, Lernziele, Aufgaben).
            Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Abbrechen
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={handleConfirmDelete}
          >
            {deleteMutation.isPending ? 'Wird gelöscht…' : 'Ja, löschen'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Beispiel 3: Create Mutation (Wizard)

```javascript
// ✅ EinheitCreateWizard.jsx (mit Active-Rejection)

import { useSecureMutation } from '@/utils/useSecureMutation';
import { secureApi } from '@/api/secureApi';
import { useNavigate } from 'react-router-dom';

export default function EinheitCreateWizard() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    titel_der_einheit: '',
    fach: '',
    jahrgangsstufe: '',
  });

  // ✅ useSecureMutation handles all errors
  const createMutation = useSecureMutation({
    mutationFn: (data) => secureApi.createEinheit(data),
    operationName: 'Einheit erstellen',
    invalidateQueries: [['einheiten']],
    successMessage: 'Einheit erfolgreich erstellt!',
    onSuccess: (result) => {
      // ✅ ONLY after successful backend call:
      // Navigate to newly created unit
      setTimeout(() => {
        navigate(`/einheiten/${result.data.id}`);
      }, 500);
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    // ❌ NO state changes here!
    // Just call mutation
    createMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      {/* Form fields */}

      {/* ✅ Submit button is ALWAYS enabled (unless mutation.isPending) */}
      <Button 
        type="submit" 
        disabled={createMutation.isPending}
        className="w-full"
      >
        {createMutation.isPending ? 'Wird erstellt…' : 'Einheit erstellen'}
      </Button>
    </form>
  );
}
```

---

## Error-Message Durchsatz: Backend → Frontend

### Szenario 1: Fachschaftsleitung versucht, Einheit für falsches Fach zu erstellen

**Backend** (`createEinheitSecure.js`):
```javascript
if (!subjects.includes(fach)) {
  rbacReason = `Cannot create unit for subject: ${fach}. You are responsible for: ${subjects.join(', ') || 'no subjects'}`;
  // ✅ Spezifische, aussagekräftige Fehlermeldung
}
return Response.json({ error: rbacReason }, { status: 403 });
```

**secureApi** (`src/api/secureApi.js`):
```javascript
} catch (error) {
  const status = error.response?.status || 500;
  const message = error.response?.data?.error || error.message;
  throw new SecureApiError(status, message); // ✅ 1:1 durchreichen
}
```

**Frontend** (`useSecureMutation`):
```javascript
onError: (error) => {
  if (error.isForbidden()) {
    toast.error(`Keine Berechtigung: ${error.message}`, {
      // ✅ Shows: "Keine Berechtigung: Cannot create unit for subject: Deutsch. You are responsible for: Mathematik, Englisch"
      description: 'Einheit erstellen konnte nicht durchgeführt werden.',
      duration: 5000,
    });
  }
}
```

**User sieht Toast**:
```
🔴 Keine Berechtigung
Cannot create unit for subject: Deutsch. You are responsible for: Mathematik, Englisch
Einheit erstellen konnte nicht durchgeführt werden.
```

### Szenario 2: Datensatz nicht gefunden (Unit wurde gelöscht)

**Backend**:
```javascript
const einheit = await base44.asServiceRole.entities.Einheiten.get(einheitId);
if (!einheit) {
  // Log to AuditLog
  return Response.json({ error: 'Einheit not found' }, { status: 404 });
}
```

**Frontend Toast**:
```
🔴 Nicht gefunden
Einheit not found
```

### Szenario 3: Erfolgreiche Aktion

**Backend**:
```javascript
await base44.asServiceRole.entities.AuditLog.create({
  user_email: user.email,
  action: 'UPDATE',
  status: 'success',
});
return Response.json({ success: true, data: updatedEinheit }, { status: 200 });
```

**Frontend Toast**:
```
✅ Einheit aktualisieren erfolgreich.
```

---

## Testing-Matrix

| Szenario | Button Sichtbar? | Button Klickbar? | Ergebnis | Toast |
|----------|------------------|------------------|----------|-------|
| User hat Rechte | ✅ Ja | ✅ Ja | 200 OK | ✅ Success |
| User hat KEINE Rechte (Fach) | ✅ Ja | ✅ Ja | 403 Forbidden | 🔴 "Keine Berechtigung: ..." |
| User ist nicht angemeldet | ✅ Ja | ✅ Ja | 401 Unauthorized | 🔴 "Authentifizierung erforderlich..." |
| Einheit existiert nicht | ✅ Ja | ✅ Ja | 404 Not Found | 🔴 "Nicht gefunden: ..." |
| Netzwerkfehler | ✅ Ja | ✅ Ja | 500+ | 🔴 "Fehler beim Update: ..." |
| Operation läuft | ✅ Ja | ❌ Nein (disabled) | — | — |

---

## Best Practices

### ✅ DO:
```javascript
// ✅ Always show button, let backend decide
<Button onClick={handleSave}>Speichern</Button>

// ✅ Use useSecureMutation for all secure ops
const mutation = useSecureMutation({...});

// ✅ Only change UI onSuccess
onSuccess: () => {
  setModalOpen(false);
  queryClient.invalidate(...);
}

// ✅ All errors are toasted automatically
// No manual error handling needed in component

// ✅ Disable button only during isPending
disabled={mutation.isPending}
```

### ❌ DON'T:
```javascript
// ❌ Don't conditionally render buttons based on frontend role
{user.role === 'Admin' && <Button>Löschen</Button>}

// ❌ Don't do optimistic updates for secure ops
setEinheiten(prev => prev.filter(e => e.id !== id)); // ❌ WRONG!

// ❌ Don't handle errors manually in components
try {
  await secureApi.deleteEinheit(id);
  // Close modal here ❌ WRONG! What if backend says 403?
} catch (err) {
  // Manual toast ❌ WRONG! useSecureMutation does this
}

// ❌ Don't send unnecessary data
mutation.mutate({ ...allFormFields }); // Filter first!

// ❌ Don't disable button for any reason other than isPending
disabled={!user.canEdit || mutation.isPending} // ❌ WRONG!
disabled={mutation.isPending} // ✅ CORRECT
```

---

## Rollout-Schritte

1. ✅ `useSecureMutation.js` erstellen
2. 🚧 Alle Formulare & Modals updaten
   - EinheitSettingsModal
   - EinheitCreateWizard
   - DeleteEinheitDialog
   - LernpaketForm
   - etc.
3. 🧪 Testen:
   - Admin: Alle Operationen erfolgreich
   - Fachschaftsleitung: Create für falsches Fach → 403 Toast
   - Fachlehrkraft: Delete ohne LEITUNG → 403 Toast
   - Unauthenticated: Alle Ops → 401 Toast
4. 📋 Dokumentation aktualisieren
5. 🚀 Rollout