# 🔒 Integration Guide: useCollaborationLock Hook

## Quick Start

Ersetze `useActivityLock` durch `useCollaborationLock` für atomare Lock-Akquisition:

### Vorher (Anfällig für Race Conditions):
```javascript
import { useActivityLock } from '@/hooks/useActivityLock';

export default function ActivityDetailView({ activityRecord, userEmail, editMode }) {
  useActivityLock(activityRecord?.id, userEmail, editMode);
  // ❌ Read-then-Write Anti-Pattern im Frontend
}
```

### Nachher (Sicher):
```javascript
import { useCollaborationLock } from '@/hooks/useCollaborationLock';

export default function ActivityDetailView({ activityRecord, userEmail, editMode }) {
  const { isLocked, retryCount } = useCollaborationLock(
    'LernpaketPhaseAktivitaet',
    ['lernpaketPhaseAktivitaeten'],
    activityRecord?.id,
    userEmail,
    editMode,
    () => console.log('Lock acquired'),
    (other) => console.log(`Lock held by ${other}`)
  );

  // ✅ Zeige Retry-Status wenn Netzwerk problematisch
  if (retryCount > 0) {
    return <div>Verbindung instabil ({retryCount}/3)...</div>;
  }

  return <div>... Formular ...</div>;
}
```

---

## Integrationen in bestehenden Komponenten

### 1. ActivityDetailView.jsx
```javascript
// Alte Zeile (23-28) ersetzen:
- const { useActivityLock, isActivityLockedByOther } = '@/hooks/useActivityLock';
- useActivityLock(activityRecord?.id, userEmail, editMode);
- const lockedByOther = isActivityLockedByOther(activityRecord, userEmail);

// Mit:
+ import { useCollaborationLock } from '@/hooks/useCollaborationLock';
+ const { isLocked: lockedByOther, retryCount } = useCollaborationLock(
+   'LernpaketPhaseAktivitaet',
+   ['lernpaketPhaseAktivitaeten'],
+   activityRecord?.id,
+   userEmail,
+   editMode
+ );
```

### 2. MasterActivityPanel.jsx (falls vorhanden)
```javascript
const { isLocked, retryCount } = useCollaborationLock(
  'MasterAufgabe',
  ['masterAufgaben'],
  masterId,
  userEmail,
  editMode,
  () => toast.success('Master-Aufgabe gesperrt'),
  (other) => toast.warning(`Wird bearbeitet von ${other}`)
);
```

### 3. KlonDetailView.jsx (falls vorhanden)
```javascript
const { isLocked, retryCount } = useCollaborationLock(
  'Aufgabenbausteine',
  ['aufgabenbausteine', 'klone'],
  klonId,
  userEmail,
  editMode
);
```

---

## Backend-Funktion aktivieren

Stelle sicher, dass `acquireLockSecure.js` gedeployed ist:

```bash
# 1. Datei sollte existieren unter:
functions/acquireLockSecure.js

# 2. Manuell testen:
POST http://localhost/functions/acquireLockSecure
{
  "entityName": "LernpaketPhaseAktivitaet",
  "entityId": "act-123"
}

# Expected response:
{
  "success": true,
  "message": "Lock acquired successfully",
  "lockedBy": "user@example.com",
  "lockedAt": "2026-04-03T10:15:00Z",
  "version": 5
}
```

---

## Pre-Save Validierung im Backend

Die Funktion `updateActivitySecure.js` wurde bereits aktualisiert (Zeilen ~125-145):

```javascript
// ✅ NEU: Pre-Save Lock-Validierung
if (aktivitaet.lock_status && aktivitaet.locked_by_user !== user.email) {
  return Response.json({
    error: 'Lock no longer held by requesting user',
    code: 'LOCK_NOT_OWNED',
    currentLockOwner: aktivitaet.locked_by_user,
    details: { expectedOwner: user.email, actualOwner: aktivitaet.locked_by_user }
  }, { status: 409 });
}
```

Diese Prüfung muss auch in `approveActivitySecure.js` hinzugefügt werden.

---

## UI-Feedback für Netzwerkprobleme

Nutze `retryCount` um Nutzern Verbindungsstatus zu zeigen:

```javascript
const { isLocked, retryCount } = useCollaborationLock(...);

return (
  <div>
    {retryCount > 0 && (
      <div className="p-3 bg-amber-100 text-amber-900 rounded">
        ⚠️ Verbindung instabil ({retryCount}/3 Versuche)
      </div>
    )}
    {retryCount >= 3 && (
      <div className="p-3 bg-red-100 text-red-900 rounded">
        ❌ Lock verloren. Bitte aktualisieren oder erneut versuchen.
      </div>
    )}
    {isLocked && (
      <Button disabled>Wird bearbeitet von jemand anderem...</Button>
    )}
  </div>
);
```

---

## Monitoring & Debugging

### Logs prüfen:
```javascript
// Browser Console zeigt:
[useCollaborationLock] Lock acquired for act-123
[useCollaborationLock] Heartbeat started
[useCollaborationLock] Heartbeat failed (attempt 1/3): Network error
[useCollaborationLock] External lock release detected
```

### Server-Logs prüfen:
```
[acquireLockSecure] Lock acquired by user@example.com on LernpaketPhaseAktivitaet/act-123 (v5)
[acquireLockSecure] Race condition detected: user@a.com lost lock. Winner: user@b.com
```

---

## Häufige Fehler

| Fehler | Ursache | Lösung |
|--------|--------|--------|
| `LOCK_HELD` (409) | Anderer User hat Lock | UI zeigt "Wird bearbeitet von X". Warte oder refresh. |
| `RACE_CONDITION_DETECTED` (409) | 2 Klicks exakt gleichzeitig | Automatisch → User B sieht Lock-Held-Fehler |
| `retryCount > 0` | Netzwerk-Probleme | Nutzer sieht Warning. Heartbeat retried nach 30s. |
| `LOCK_NOT_OWNED` (409) beim Save | Heartbeat failte 3x | User kann nicht speichern. Lock wurde freigegeben. |

---

## Migrationsplan

**Schritt 1:** `acquireLockSecure.js` deployen  
**Schritt 2:** `useCollaborationLock.js` erstellen  
**Schritt 3:** `updateActivitySecure.js` + `approveActivitySecure.js` mit Pre-Save Validierung aktualisieren  
**Schritt 4:** `ActivityDetailView.jsx` migrieren  
**Schritt 5:** Tests: 2 Browser-Tabs öffnen, gleichzeitig "Bearbeiten" klicken  
**Schritt 6:** Weitere Views migrieren (Master, Klone, etc.)