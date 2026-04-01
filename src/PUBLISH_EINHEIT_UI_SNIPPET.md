# Publish Einheit - UI Integration (Active-Rejection Pattern)

## Component Snippet: Publish Button mit useSecureMutation

```javascript
// ✅ EinheitDetailHeader.jsx oder ähnlich

import { useSecureMutation } from '@/utils/useSecureMutation';
import { secureApi } from '@/api/secureApi';
import { Button } from '@/components/ui/button';
import { Rocket, Lock } from 'lucide-react';
import { useState } from 'react';

export default function PublishEinheitButton({ einheit, onPublishSuccess }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ useSecureMutation with Active-Rejection
  const publishMutation = useSecureMutation({
    mutationFn: () => secureApi.publishEinheit(
      einheit.id,
      'Freigegeben für Moodle'
    ),
    operationName: 'Einheit freigeben',
    invalidateQueries: [['einheiten'], ['workspace', einheit.id]],
    successMessage: `Einheit "${einheit.titel_der_einheit}" freigegeben.`,
    onSuccess: () => {
      setConfirmOpen(false);
      if (onPublishSuccess) onPublishSuccess();
    },
  });

  const handleConfirmPublish = () => {
    // ❌ NO state changes here!
    // mutation.mutate() handles all the rest
    publishMutation.mutate();
  };

  // Status-Anzeige
  const isAlreadyPublished = einheit.freigabe_status === 'Freigegeben für Moodle';
  const isLoading = publishMutation.isPending;

  return (
    <>
      {/* ✅ Button ALWAYS visible (Active-Rejection) */}
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={isLoading || isAlreadyPublished}
        variant={isAlreadyPublished ? 'secondary' : 'default'}
        className="gap-2"
      >
        <Rocket className="w-4 h-4" />
        {isAlreadyPublished ? 'Bereits freigegeben' : 'Freigeben für Moodle'}
      </Button>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einheit freigeben?</AlertDialogTitle>
            <AlertDialogDescription>
              Einheit "{einheit.titel_der_einheit}" wird für den Moodle-Export freigegeben.
              Diese Aktion kann später rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Abbrechen
            </AlertDialogCancel>
            <Button
              onClick={handleConfirmPublish}
              disabled={isLoading}
              className="gap-2"
            >
              <Rocket className="w-4 h-4" />
              {isLoading ? 'Wird freigegeben…' : 'Ja, freigeben'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

## Status-Badge Component

```javascript
// ✅ EinheitStatusBadge.jsx

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

export default function EinheitStatusBadge({ status }) {
  if (status === 'Freigegeben für Moodle') {
    return (
      <Badge className="bg-green-100 text-green-700 gap-2 flex w-fit">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Freigegeben für Moodle
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-100 text-amber-700 gap-2 flex w-fit">
      <Clock className="w-3.5 h-3.5" />
      In Planung
    </Badge>
  );
}
```

---

## Integration in EinheitPanel (Workspace)

```javascript
// In WorkspaceDetailPanel.jsx (existing code)

// Füge den Publish Button hinzu:

function EinheitPanel({ einheit, lernpakete, lernziele, aufgaben, themenfelder = [], kannBearbeiten, userEmail, onNavigate, onEdit }) {
  // ... existing code ...

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{einheit.titel_der_einheit}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {einheit.fach} · Jahrgang {einheit.jahrgangsstufe}
          </p>
        </div>
        {kannBearbeiten && (
          <div className="flex items-center gap-2">
            {/* ✅ Publish Button */}
            <PublishEinheitButton
              einheit={einheit}
              onPublishSuccess={() => {
                // Optional: refresh data
              }}
            />
            {/* ✅ Existing Edit Button */}
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Edit className="w-4 h-4" /> Bearbeiten
            </Button>
          </div>
        )}
      </div>

      {/* Status-Badge */}
      <EinheitStatusBadge status={einheit.freigabe_status} />

      {/* ... rest of component ... */}
    </div>
  );
}
```

---

## Test-Szenarien

### ✅ Szenario 1: Admin publiziert eine Einheit
```
1. Admin öffnet Einheit "Mathematik Grundlagen"
2. Status: "In Planung"
3. Klickt "Freigeben für Moodle"
4. Confirmation Dialog: "Ja, freigeben"
5. publishEinheitSecure.js:
   - Auth: ✅ Admin
   - RBAC: ✅ role === 'Administrator' → allowed
   - Status-Update: ✅ In Planung → Freigegeben für Moodle
   - AuditLog: { action: 'PUBLISH', status: 'success' }
6. Toast: ✅ "Einheit freigegeben."
7. UI: Status-Badge wechselt zu "Freigegeben für Moodle", Button disabled
```

### ❌ Szenario 2: Fachlehrkraft versucht zu publishen (falsch)
```
1. Fachlehrkraft öffnet Einheit
2. Klickt "Freigeben für Moodle" (Button ist sichtbar!)
3. publishEinheitSecure.js:
   - Auth: ✅ User angemeldet
   - RBAC: ❌ role === 'Fachlehrkraft' → not allowed
   - AuditLog: { action: 'PUBLISH', status: 'failed', error_message: 'Role Fachlehrkraft cannot publish...' }
4. Response: 403 Forbidden
5. Toast: 🔴 "Keine Berechtigung: Role Fachlehrkraft cannot publish units. Only Administrator and Fachschaftsleitung are allowed."
6. UI: Bleibt unverändert, Status ist noch "In Planung"
```

### ❌ Szenario 3: Fachschaftsleitung für falsches Fach
```
1. Fachschaftsleitung (Deutsch) öffnet Mathematik-Einheit
2. Klickt "Freigeben für Moodle"
3. publishEinheitSecure.js:
   - Auth: ✅ User angemeldet
   - RBAC: ❌ 'Mathematik' ∉ fachbereich_zustaendigkeit
   - AuditLog: { action: 'PUBLISH', status: 'failed', error_message: 'Cannot publish unit for subject: Mathematik. You are responsible for: Deutsch' }
4. Response: 403 Forbidden
5. Toast: 🔴 "Keine Berechtigung: Cannot publish unit for subject: Mathematik. You are responsible for: Deutsch"
6. UI: Unverändert
```

### ❌ Szenario 4: Einheit wurde bereits gelöscht
```
1. User öffnet Einheit ID: abc123 (ist aber gelöscht)
2. Klickt "Freigeben für Moodle"
3. publishEinheitSecure.js:
   - Auth: ✅
   - Fetch: ❌ Einheit nicht gefunden
4. Response: 404 Not Found
5. Toast: 🔴 "Nicht gefunden: Einheit not found"
6. UI: Unverändert
```

---

## Error-Toast Variations

### 403 Forbidden (RBAC)
```
🔴 Keine Berechtigung
Role Fachlehrkraft cannot publish units. Only Administrator and Fachschaftsleitung are allowed.
Einheit freigeben konnte nicht durchgeführt werden.
```

### 404 Not Found
```
🔴 Nicht gefunden
Einheit not found
```

### 400 Bad Request (bereits freigegeben)
```
🔴 Fehler beim Einheit freigeben
Einheit is already in status: Freigegeben für Moodle
```

### 200 Success
```
✅ Einheit freigegeben.
```

---

## Key Points

1. **Button immer sichtbar**: Wird für alle angezeigt (Active-Rejection)
2. **Nur isPending disabledState**: `disabled={isLoading || isAlreadyPublished}`
3. **Keine Voraussetzungs-Checks im Frontend**: RBAC prüft Backend
4. **Toast zeigt exact Backend-Fehler**: 1:1 Nachricht durchgeleitet
5. **Keine Optimistic Updates**: UI ändert sich nur nach 200 OK
6. **Audit Trail**: Alle Versuche (Success/Fail) werden geloggt