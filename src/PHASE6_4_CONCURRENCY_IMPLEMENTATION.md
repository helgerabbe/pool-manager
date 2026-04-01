# Phase 6.4: Concurrency & Multi-Tab State Management

## Übersicht

Diese Phase adressiert die letzten zwei Audit-Punkte:
- **Audit 2**: Race Conditions bei gleichzeitigen Änderungen
- **Audit 6**: State Management & LocalStorage-Konflikte über Tab-Grenzen hinweg

## 1. Backend: Optimistic Locking mit `version`-Feld

### Entity-Schema Update (Einheiten.json)

```json
{
  "version": {
    "type": "integer",
    "default": 1,
    "description": "Optimistic Locking Version (inkrementiert bei jedem Update)"
  }
}
```

**Standard-Wert**: `1` bei Entity-Erstellung.

### Update-Endpunkt: `updateEinheitSecure.js`

```javascript
// Client sendet: { einheit_id: "123", version: 2, titel_der_einheit: "..." }

// Backend prüft:
const dbVersion = currentEinheit.version || 1; // aktuell in DB: 2
if (version && version !== dbVersion) {
  // Conflict: Client hat Version 2, DB aber auch Version 2?
  // → Wahrscheinlich: Client schickt alte Version 1, DB hat aber 2 (anderer User hat Update gemacht)
  return HTTP 409 Conflict {
    error: 'Version conflict',
    current_version: 2,  // Was DB derzeit hat
    provided_version: 1, // Was Client schickte
  };
}

// Bei Success:
updateData.version = dbVersion + 1; // Inkrementiere Version
```

**Workflow**:
1. User A lädt Einheit → erhält `version: 5`
2. User B lädt Einheit → erhält `version: 5`
3. User B ändert Titel → sendet Update mit `version: 5`
   - Backend: DB hat Version 5, Client sendet 5 → Match ✅
   - DB inkrementiert auf `version: 6`
4. User A versucht Update mit `version: 5`
   - Backend: DB hat Version 6, Client sendet 5 → **409 Conflict**
   - User A muss Seite neu laden und erneut editieren

### Error Response (HTTP 409)

```json
{
  "error": "Version conflict",
  "message": "Speicherkonflikt: Ein anderer Nutzer hat diese Daten in der Zwischenzeit geändert. Aktualisieren Sie die Seite.",
  "current_version": 6,
  "provided_version": 5,
  "status": 409
}
```

---

## 2. Frontend: 409 Konflikt-Auflösung

### secureApi.js Enhancement

```javascript
export class SecureApiError extends Error {
  constructor(status, message, additionalData = {}) {
    super(message);
    this.status = status;
    this.additionalData = additionalData;
  }

  isConflict() {
    return this.status === 409;
  }
}

export async function updateEinheit(einheitId, data) {
  try {
    const response = await base44.functions.invoke('updateEinheitSecure', {
      einheit_id: einheitId,
      ...data, // Inklusive: version
    });
    return response.data;
  } catch (error) {
    const additionalData = {
      current_version: error.response?.data?.current_version,
      provided_version: error.response?.data?.provided_version,
    };
    throw new SecureApiError(status, message, additionalData);
  }
}
```

### useSecureMutation.js: 409 Toast

```javascript
onError: (error) => {
  // 409 CONFLICT: Optimistic Locking - Version mismatch
  if (error.isConflict && error.isConflict()) {
    toast.error('Speicherkonflikt', {
      description: 'Ein anderer Nutzer hat diese Daten in der Zwischenzeit geändert. Bitte laden Sie die Seite neu.',
      duration: 6000,
    });
  }
  // ... weitere Error-Handler
}
```

### Benutzer-Feedback Dialog (Optional)

```jsx
const [showConflictDialog, setShowConflictDialog] = useState(false);

const mutation = useSecureMutation({
  mutationFn: (data) => secureApi.updateEinheit(id, data),
  onError: (error) => {
    if (error.isConflict?.()) {
      setShowConflictDialog(true);
    }
  },
});

return (
  <>
    <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
      <DialogContent>
        <DialogTitle>Speicherkonflikt</DialogTitle>
        <p>
          Ein anderer Nutzer hat diese Daten in der Zwischenzeit geändert.
          Laden Sie die Seite neu, um die aktuellen Daten zu sehen.
        </p>
        <Button onClick={() => window.location.reload()}>
          Seite neu laden
        </Button>
      </DialogContent>
    </Dialog>
  </>
);
```

---

## 3. State Management: Storage-Trennung

### Problem: localStorage vs. sessionStorage

**localStorage** (Problematisch für Ansichts-State):
- Persisistiert über Browser-Neustarts
- Teilt sich Daten zwischen **allen Tabs** ohne Kontrolle
- Ideal für: Theme, Sprache, Benutzereinstellungen

**sessionStorage** (Ideal für Ansichts-State):
- Wird gelöscht wenn Tab/Browser geschlossen
- Jeder Tab hat eigenes sessionStorage (isolation)
- Ideal für: "Bin ich in Detail-Ansicht?", "Welches Element ist selektiert?"

### Beispiel: Workspace-State Migration

```javascript
// ❌ VORHER: Alle States in localStorage
const [viewMode, setViewMode] = useState(() => {
  return localStorage.getItem('workspace-viewMode') || 'detail';
});

// ✅ NACHHER: View-State in sessionStorage
const [viewMode, setViewMode] = useSessionStorageState(
  'workspace-viewMode',
  'detail'
);

// ✅ Bleibt in localStorage (wenn wirklich persistent nötig)
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('app-theme') || 'light';
});
```

### Welcher Storage für welche Daten?

| Data Type | localStorage | sessionStorage | Grund |
|-----------|--|--|---|
| Ansichts-Modus (Detail/Struktur) | ❌ | ✅ | Nur für diese Session relevant |
| Selektiertes Element | ❌ | ✅ | Session-spezifisch |
| Sidebar-Expanded Status | ❌ | ✅ | Keine Notwendigkeit zu merken |
| Dark/Light Theme | ✅ | ❌ | Nutzer-Präferenz, persistent |
| Sprache | ✅ | ❌ | Nutzer-Einstellung, persistent |
| Draft-Daten | ✅ | ❌ (aber mit Tab-Kontext!) | Sollten auch nach Tab-Schließung erhalten sein |

---

## 4. BroadcastChannel: Cross-Tab Synchronisierung

### useCrossTabSync.js Hook

```javascript
const { sendMessage, isSupported } = useCrossTabSync('einheit-sync', (message) => {
  if (message.type === 'STRUCTURAL_LOCK_ACQUIRED') {
    console.log(`Einheit ${message.einheit_id} wurde von ${message.locked_by} gesperrt`);
    setEditDisabled(true);
  }
});

// Sende Nachricht an alle anderen Tabs
sendMessage({
  type: 'STRUCTURAL_LOCK_ACQUIRED',
  einheit_id: '123',
  locked_by: 'user@email.com',
  locked_at: new Date().toISOString(),
});
```

### Real-World Szenario: Structural Lock

**Tab A (User A)**:
```javascript
// User A öffnet Einheit 123 zur Bearbeitung
await base44.entities.Einheiten.update('123', {
  structural_lock: user.email,
  structural_locked_at: new Date().toISOString(),
});

// Benachrichtige andere Tabs
sendMessage({
  type: 'STRUCTURAL_LOCK_ACQUIRED',
  einheit_id: '123',
  locked_by: user.email,
});
```

**Tab B (User A, gleiche Person)**:
```javascript
// Listener für Lock-Nachrichten
useCrossTabSync('einheit-sync', (message) => {
  if (message.type === 'STRUCTURAL_LOCK_ACQUIRED' && message.einheit_id === currentEinheitId) {
    setLocked(true); // ← Sofort deaktivieren ohne Reload!
    toast.info('Diese Einheit wird in einem anderen Tab bearbeitet.');
  }
});
```

### Vordefinierte Message-Typen

```javascript
export const CrossTabMessageTypes = {
  STRUCTURAL_LOCK_ACQUIRED: 'STRUCTURAL_LOCK_ACQUIRED',
  STRUCTURAL_LOCK_RELEASED: 'STRUCTURAL_LOCK_RELEASED',
  VIEW_MODE_CHANGED: 'VIEW_MODE_CHANGED',
  SELECTED_ITEM_CHANGED: 'SELECTED_ITEM_CHANGED',
  DRAFT_STARTED: 'DRAFT_STARTED',
  DRAFT_SAVED: 'DRAFT_SAVED',
  DRAFT_DISCARDED: 'DRAFT_DISCARDED',
  DATA_CHANGED_EXTERNAL: 'DATA_CHANGED_EXTERNAL',
  CACHE_INVALIDATE: 'CACHE_INVALIDATE',
};
```

---

## 5. Draft-State mit Tab-Kontext

### Problem: Überschreibende Drafts

**Szenario**:
- Tab A: Bearbeitet Einheit 123 → speichert Draft unter `draft:einheit:123`
- Tab B: Bearbeitet auch Einheit 123 → speichert Draft unter `draft:einheit:123`
- **Result**: Draft von Tab A wird überschrieben!

### Lösung: Tab-Kontext-Isolierung

```javascript
const { draft, updateDraft, clearDraft, isDraft, tabId } = useDraftStateWithContext(
  'einheit',
  '123',
  { title: '', description: '' }
);

// Intern speichert dieser Hook Drafts als:
// localStorage['draft:einheit:123:tab-abc-123-def']
//
// Ein anderer Tab speichert:
// localStorage['draft:einheit:123:tab-xyz-456-789']
//
// → Kein Überschreiben! Jeder Tab hat seinen eigenen Draft.
```

### Tab-ID Persistierung (für die Session)

```javascript
function getTabId() {
  const tabIdKey = '__base44_tab_id__';
  let tabId = sessionStorage.getItem(tabIdKey);

  if (!tabId) {
    tabId = uuidv4(); // Generiere eindeutige ID
    sessionStorage.setItem(tabIdKey, tabId); // Speichere für diese Session
  }

  return tabId;
}

// Tab A hat: '7f2c4e....'
// Tab B hat: 'a9d3k1....'
// Jeder Tab behält seine ID für die ganze Session (solange nicht gelöscht)
```

---

## Integration in Komponenten

### Beispiel 1: EinheitSettingsModal mit Version-Aware Update

```javascript
import { useSessionStorageState } from '@/hooks/useSessionStorageState';
import { useSecureMutation } from '@/utils/useSecureMutation';
import { secureApi } from '@/api/secureApi';

export function EinheitSettingsModal({ einheit }) {
  // sessionStorage für Modal-Offenheit (kein localStorage)
  const [isOpen, setIsOpen] = useSessionStorageState('einheit-settings-modal', false);

  const mutation = useSecureMutation({
    mutationFn: async (data) => {
      // Sende aktuelle Version mit
      return secureApi.updateEinheit(einheit.id, {
        ...data,
        version: einheit.version, // ← WICHTIG: Version mitschicken!
      });
    },
    onSuccess: (result) => {
      // Aktualisiere lokale Einheit mit neuer Version
      setEinheit(result.data);
      toast.success('Gespeichert.');
    },
    onError: (error) => {
      if (error.isConflict?.()) {
        toast.error('Speicherkonflikt! Seite wird aktualisiert...');
        setTimeout(() => window.location.reload(), 2000);
      }
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* ... */}
    </Dialog>
  );
}
```

### Beispiel 2: Workspace mit BroadcastChannel Lock-Sync

```javascript
import { useCrossTabSync, CrossTabMessageTypes } from '@/hooks/useCrossTabSync';

export function EinheitViewManager() {
  const [isLocked, setIsLocked] = useState(false);
  const { sendMessage } = useCrossTabSync('workspace-einheit', (message) => {
    if (message.type === CrossTabMessageTypes.STRUCTURAL_LOCK_ACQUIRED) {
      if (message.einheit_id === currentEinheitId) {
        setIsLocked(true); // ← Sofort deaktivieren ohne Reload!
      }
    }
  });

  const handleStartEditing = async () => {
    await base44.entities.Einheiten.update(currentEinheitId, {
      structural_lock: user.email,
      structural_locked_at: new Date().toISOString(),
    });

    // Benachrichtige andere Tabs
    sendMessage({
      type: CrossTabMessageTypes.STRUCTURAL_LOCK_ACQUIRED,
      einheit_id: currentEinheitId,
      locked_by: user.email,
    });
  };

  return (
    <div>
      <button disabled={isLocked} onClick={handleStartEditing}>
        {isLocked ? 'Wird in anderem Tab bearbeitet' : 'Bearbeiten'}
      </button>
    </div>
  );
}
```

### Beispiel 3: Draft mit Tab-Kontext

```javascript
import { useDraftStateWithContext } from '@/hooks/useDraftStateWithContext';

export function LernpaketEditor({ lernpaketId }) {
  const { draft, updateDraft, clearDraft, isDraft } = useDraftStateWithContext(
    'lernpaket',
    lernpaketId,
    { titel: '', dauer: 0 }
  );

  const handleInputChange = (field, value) => {
    updateDraft({ [field]: value }); // Speichert sofort in localStorage
  };

  const handleSave = async () => {
    await base44.entities.Lernpakete.update(lernpaketId, draft);
    clearDraft(); // Lösche Draft nach erfolgreichem Save
    toast.success('Gespeichert!');
  };

  return (
    <div>
      <input
        value={draft.titel}
        onChange={(e) => handleInputChange('titel', e.target.value)}
        placeholder="Titel"
      />
      {isDraft && <Badge>Unsaved</Badge>}
      <button onClick={handleSave} disabled={!isDraft}>
        Speichern
      </button>
    </div>
  );
}
```

---

## Testing: Concurrency Scenarios

### Test 1: Version Conflict (409)

```javascript
// Simuliere zwei gleichzeitige Updates
const user1 = await loadEinheit('123'); // erhält version: 5

const user2 = await loadEinheit('123'); // erhält version: 5

// User 1 aktualisiert zuerst
await updateEinheit('123', { title: 'New Title', version: 5 });
// → DB inkrementiert auf version: 6

// User 2 versucht Update mit alter version
await updateEinheit('123', { title: 'Other Title', version: 5 });
// → HTTP 409 Conflict

// User 2 muss Seite neu laden und erneut bearbeiten
window.location.reload();
```

### Test 2: BroadcastChannel Lock-Sync

```javascript
// Öffne zwei Browser-Tabs mit der gleichen Anwendung

// Tab A: Klicke "Strukturbearbeitung starten"
// → Setzt structural_lock + sendet BroadcastChannel Message

// Tab B: Beobachte sofort die Deaktivierung der Edit-Buttons
// (kein Page-Reload nötig!)

// Tab A: Klicke "Speichern" oder "Bearbeitung beenden"
// → Löscht structural_lock + sendet LOCK_RELEASED

// Tab B: Beobachte sofort die Aktivierung der Edit-Buttons
```

### Test 3: Draft Isolation

```javascript
// Öffne zwei Browser-Tabs mit der gleichen Einheit

// Tab A: Ändere Titel → Draft speichert unter "draft:einheit:123:tab-A-ID"
// Tab B: Ändere Titel → Draft speichert unter "draft:einheit:123:tab-B-ID"

// Überprüfe localStorage (DevTools):
// "draft:einheit:123:tab-A-ID": { title: "Tab A Version" }
// "draft:einheit:123:tab-B-ID": { title: "Tab B Version" }

// Schließe Tab A → sein Draft bleibt in localStorage
// (falls persistent benötigt, kann anderer Tab ihn später laden)

// Schließe Tab B → sein Draft wird gelöscht (sessionStorage-Cleanup)
```

---

## Migration Checklist

- [ ] `version` Feld zu allen relevanten Entities hinzufügen (Einheiten, Lernpakete, Aufgaben, etc.)
- [ ] `updateEinheitSecure.js` mit Version-Check updaten (HTTP 409 auf Konflikt)
- [ ] `secureApi.js` mit `isConflict()` Methode erweitern
- [ ] `useSecureMutation.js` mit 409 Error-Handler updaten
- [ ] `useCrossTabSync.js` Hook implementieren
- [ ] `useSessionStorageState.js` Hook implementieren
- [ ] `useDraftStateWithContext.js` mit Tab-Isolierung implementieren
- [ ] Komponenten migrieren: localStorage → sessionStorage (für View-State)
- [ ] Workspace-Komponenten mit BroadcastChannel Lock-Sync updaten
- [ ] Tests für 409 Conflicts & BroadcastChannel schreiben

---

## Performance-Hinweise

1. **BroadcastChannel**: Lädt Browser-native, keine externe Abhängigkeit
2. **sessionStorage**: Schneller als localStorage (weniger Daten synced)
3. **Version-Feld**: Minimale Overhead (nur ein Integer), große Konflikt-Vermeidung
4. **Tab-Context**: UUID wird nur einmal per Session generiert

---

## Browser-Kompatibilität

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| BroadcastChannel | ✅ 54+ | ✅ 38+ | ✅ 15.1+ | ✅ 79+ |
| sessionStorage | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| UUID generation | ✅ (npm:uuid) | ✅ | ✅ | ✅ |

Fallback für alte Browser:
```javascript
if (typeof BroadcastChannel === 'undefined') {
  console.warn('BroadcastChannel not supported, single-tab mode only');
}
``