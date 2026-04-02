# Export-Lockdown & Admin-Freigabe – Integrations-Guide

## Überblick

Das **Export-Lockdown-System** sperrt die gesamte Bearbeitungsoberfläche (Ebene 1-4) während eines laufenden Moodle-Exports, um Datenkonsistenz zu gewährleisten. Nur Admins können den Export-Abschluss bestätigen und die Sperre aufheben.

---

## 1. Hook: `useExportLock`

### Verwendung

```javascript
import { useExportLock } from '@/hooks/useExportLock';

function MyComponent({ einheitId }) {
  const { isLocked, pendingCount, pendingElements } = useExportLock(einheitId);

  if (isLocked) {
    return <div>Einheit ist gesperrt! {pendingCount} Elemente warten auf Export.</div>;
  }

  return <div>Normal Bearbeitungsmodus</div>;
}
```

### Properties

| Prop | Typ | Beschreibung |
|------|-----|---|
| `isLocked` | `boolean` | `true` wenn mindestens ein Element `sync_status='pending'` hat |
| `pendingCount` | `number` | Anzahl der Elemente mit `sync_status='pending'` |
| `pendingElements` | `array` | Alle Elemente (Pakete, Aktivitäten, Masters, Klone) mit `sync_status='pending'` |

### Auto-Refresh

Der Hook aktualisiert alle **3 Sekunden**, um Live-Updates zu liefern:

```javascript
refetchInterval: 3000, // Auto-refresh während Export
```

---

## 2. Frontend-Integration

### Banner in den Ebenen 1-4

Integriere `ExportLockBanner` oben in die Workspace-Seiten:

```jsx
import { useExportLock } from '@/hooks/useExportLock';
import { ExportLockBanner } from '@/components/export/ExportLockBanner';

function WorkspaceTab({ einheitId }) {
  const { isLocked, pendingCount } = useExportLock(einheitId);

  return (
    <>
      {isLocked && <ExportLockBanner pendingCount={pendingCount} />}
      {/* Rest des Tabs: Read-Only wenn isLocked=true */}
    </>
  );
}
```

### Read-Only Modus (Ebenen 1-4)

Alle Eingabe-Komponenten sollten die `disabled`-Flag setzen:

```jsx
{/* Beispiel: Button in Lernpaket-Editor */}
<Button disabled={isLocked} onClick={handleSave}>
  Speichern
</Button>

{/* Beispiel: Form-Input */}
<Input disabled={isLocked} value={title} onChange={handleChange} />
```

---

## 3. Ebene 5: Export-Cockpit View

Die `ExportCockpitView` zeigt automatisch die richtige Ansicht:

```jsx
import ExportCockpitView from '@/components/export/ExportCockpitView';

// In Workspace oder einer Admin-Seite:
<ExportCockpitView einheitId={currentEinheit} userRole={userRole} />
```

### Automatische Ansicht-Umschaltung

| Zustand | Anzeige |
|---------|---------|
| `isLocked=false` | Normal Export-Cockpit (mit Checkboxen & "Jetzt exportieren"-Button) |
| `isLocked=true` | Warteschleifen-View (zeigt nur pending Elements) |

---

## 4. Admin-Freigabe-Button

### Komponente: `ExportConfirmationButton`

```jsx
import { ExportConfirmationButton } from '@/components/admin/ExportConfirmationButton';

// Nur für Admins sichtbar
<ExportConfirmationButton 
  einheitId={currentEinheit} 
  userRole={userRole}
  className="mb-4"
/>
```

### Logik

1. **Klick** → Ruft Backend-Funktion `confirmExportCompletion` auf
2. Backend führt Bulk-Update durch: `sync_status: 'pending'` → `sync_status: 'synced'`
3. `last_synced_at` wird auf aktuelle Zeit gesetzt
4. Alle Queries werden invalidiert → Frontend aktualisiert sich automatisch
5. Lock wird aufgehoben (`isLocked=false`)

### Response

```json
{
  "success": true,
  "message": "✓ Export abgeschlossen. 5 Elemente aktualisiert.",
  "updated_count": 5,
  "timestamp": "2026-04-02T10:30:00.000Z"
}
```

---

## 5. Backend-Funktion: `confirmExportCompletion`

### Signature

```javascript
POST /functions/confirmExportCompletion
Content-Type: application/json

{
  "einheit_id": "xyz123"
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "✓ Export abgeschlossen. 12 Elemente aktualisiert.",
  "updated_count": 12,
  "timestamp": "2026-04-02T10:30:00.000Z"
}
```

### Fehler-Handling

```json
{
  "error": "Forbidden: Admin access required",
  "status": 403
}
```

---

## 6. Workflow-Beispiel

### Normalfall (User exportiert)

```
┌─────────────────────────────────────────┐
│ 1. User wählt Aufgaben im Cockpit       │
│    (10 Aufgaben selected)               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 2. User klickt "🚀 Jetzt exportieren"   │
│    sync_status: 'approved' → 'pending'  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 3. Frontend: isLocked=true               │
│    - ExportWaitingView zeigt pending    │
│    - Ebenen 1-4: Read-Only Mode         │
│    - Auto-refresh alle 3 Sekunden       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 4. Admin klickt                         │
│    "✓ Export-Abschluss bestätigen"      │
│    sync_status: 'pending' → 'synced'    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ 5. Frontend: Queries invalidieren       │
│    isLocked=false → Lockdown aufgehoben │
│    - Cockpit zeigt wieder Checkboxen    │
│    - Ebenen 1-4: Edit-Modus freigebeben│
└─────────────────────────────────────────┘
```

---

## 7. Integration in Workspace

### In `pages/Workspace.jsx`

```jsx
// Hook hinzufügen
const { isLocked, pendingCount } = useExportLock(selectedEinheitId);

// In jedem Tab-Content:
{isLocked && <ExportLockBanner pendingCount={pendingCount} />}

// Alle Buttons/Inputs mit disabled={isLocked} versehen
<Button disabled={isLocked}>Speichern</Button>
```

### In `components/export/ExportCockpitView.jsx`

Die View schaltet automatisch um:

```jsx
if (isLocked) {
  return (
    <div>
      <ExportWaitingView pendingElements={pendingElements} />
      {userRole === 'admin' && (
        <ExportConfirmationButton einheitId={einheitId} userRole={userRole} />
      )}
    </div>
  );
}

// Normal Cockpit mit Checkboxen & Export-Button
return <div>... Cockpit UI ...</div>;
```

---

## 8. Fehlerbehandlung

### Timeouts beim Auto-Refresh

Falls `refetchInterval` nicht schnell genug ist (z.B. langsames Netzwerk), können Nutzer manuell aktualisieren:

```jsx
<Button onClick={() => queryClient.invalidateQueries()}>
  Manuell aktualisieren
</Button>
```

### Admin-Bestätigung fehlgeschlagen

Wenn der Admin-Button fehlt (Status 403/401):

```javascript
// ExportConfirmationButton zeigt automatisch null für Non-Admins
if (userRole !== 'admin') {
  return null;
}
```

---

## 9. Testing

### Mock-Szenario: Export starten

```javascript
// In Storybook/Jest:
const { isLocked, pendingCount } = useExportLock('unit-123');

// Simuliere Export-Start
await updateActivity({ sync_status: 'pending' });

// Hook sollte isLocked=true zurückgeben
expect(isLocked).toBe(true);
expect(pendingCount).toBe(1);
```

### Mock-Szenario: Admin-Bestätigung

```javascript
// Klick auf Admin-Button
await user.click(screen.getByText('Export-Abschluss bestätigen'));

// Backend aktualisiert pending → synced
// Hook sollte isLocked=false zurückgeben
await waitFor(() => {
  expect(isLocked).toBe(false);
});
```

---

## 10. Checkliste für Integration

- ✅ `useExportLock` in Workspace importieren
- ✅ `ExportLockBanner` oben in jedem Tab anzeigen (wenn `isLocked=true`)
- ✅ Alle Input-Komponenten mit `disabled={isLocked}` versehen
- ✅ `ExportCockpitView` mit `userRole` prop übergeben
- ✅ `ExportConfirmationButton` in Admin-Interface sichtbar machen
- ✅ Backend-Funktion `confirmExportCompletion` testet & deployed
- ✅ Query-Invalidierung korrekt eingestellt (3 Sekunden Refresh)
- ✅ Error-Handling für Status 403/401 implementiert

---

## Notizen

1. **Lock ist global pro Einheit**: Alle 5 Tabs sind gleichzeitig betroffen
2. **Tombstones werden nicht berücksichtigt**: Nur `sync_status='pending'` zählt
3. **Auto-Refresh ist absichtlich 3 Sekunden**: Zu schnell = hohe DB-Last
4. **Nur Admins können Freigeben**: Rollenprüfung ist hardcodiert
5. **last_synced_at wird gesetzt**: Nutzer können Export-Zeitpunkte sehen