# Phase 6.6: Datenkonsistenz, Schema-Validierung & State Machines

## 📋 Audit-Punkte 9 & 10: Datenintegrität & Status-Workflows

---

## 1. Schema-Validierung

### 1.1 Frontend-Validierungsschemata (`lib/validationSchemas.js`)

Definiert Pflichtfelder und Validierungsregeln:

```javascript
const EINHEIT_SCHEMA = {
  titel_der_einheit: {
    required: true,
    type: 'string',
    minLength: 3,
    errorMessage: 'Titel der Einheit ist erforderlich (mindestens 3 Zeichen)',
  },
  fach: {
    required: true,
    type: 'enum',
    allowedValues: ['Deutsch', 'Mathematik', ...],
    errorMessage: 'Fach ist erforderlich und muss gültig sein',
  },
  jahrgangsstufe: {
    required: true,
    type: 'enum',
    allowedValues: ['5', '6', '7', ...],
    errorMessage: 'Jahrgangsstufe ist erforderlich',
  },
  gesamtziel: {
    required: false,  // ← Optional
    type: 'string',
    nullable: true,
  },
};
```

**Verfügbare Schemata**:
- `EINHEIT_SCHEMA` – Einheiten mit Pflichtfeldern
- `LERNPAKET_SCHEMA` – Lernpakete
- `AUFGABE_SCHEMA` – Aufgabenbausteine

---

### 1.2 Frontend-Validierung vor API-Call

```javascript
// secureApi.js
export async function createEinheit(data) {
  // Validiere VOR dem API-Call
  const validation = validateEntity(data, EINHEIT_SCHEMA);
  
  if (!validation.valid) {
    const error = new SecureApiError(400, 'Validierungsfehler');
    error.validationErrors = validation.errors; // Field-Level Errors
    throw error;
  }

  // ✅ Validierung passed → sende zu Backend
  const response = await base44.functions.invoke('createEinheitSecure', data);
  return response.data;
}
```

**Fehler-Struktur**:
```javascript
{
  valid: false,
  errors: {
    titel_der_einheit: "Titel der Einheit ist erforderlich (mindestens 3 Zeichen)",
    fach: "Fach ist erforderlich und muss gültig sein"
  }
}
```

---

### 1.3 UI-Integration: Field-Level Error Display

```jsx
// EinheitFormWithValidation.jsx
<div className="space-y-2">
  <Label>Titel der Einheit *</Label>
  <input
    value={formData.titel_der_einheit}
    onChange={(e) => handleChange('titel_der_einheit', e.target.value)}
    className={
      validationErrors.titel_der_einheit
        ? 'border-red-300 bg-red-50'  // ← Rot wenn Error
        : 'border-input'
    }
  />
  {validationErrors.titel_der_einheit && (
    <p className="text-xs text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />
      {validationErrors.titel_der_einheit}
    </p>
  )}
</div>
```

**Verhalten**:
- ✅ Titel passt → Kein Error
- ❌ Titel leer → Rot markiert + Error-Text
- ✅ Benutzer ändert Feld → Error wird automatisch gelöscht
- ❌ Submit fehlgeschlagen → Neue Errors anzeigen

---

## 2. State Machine für Status-Workflows

### 2.1 State Machine Definition (`lib/stateMachine.js`)

```javascript
// Erlaubte Übergänge für freigabe_status
const TRANSITIONS = {
  'In Planung': [
    'In Planung',           // Selbst-Übergang erlaubt
    'Freigegeben für Moodle' // Nur zu "Freigegeben"
  ],
  'Freigegeben für Moodle': [
    'Freigegeben für Moodle', // Selbst-Übergang erlaubt
    'In Planung'              // Zurück zu "In Planung"
  ],
};
```

**Workflow-Diagramm**:
```
┌─────────────────┐
│  In Planung     │
│  (Initial)      │
└────────┬────────┘
         │
         │ (Freigeben)
         ↓
┌──────────────────────────┐
│ Freigegeben für Moodle   │
│ (Ready for Export)       │
└──────────────────────────┘
         ↑
         │ (Zurück zum Editieren)
         │
    (Selbst-Übergänge möglich)
```

### 2.2 State Machine API

```javascript
import { getAllowedTransitions, isValidTransition } from '@/lib/stateMachine';

// Alle erlaubten Zustände für aktuellen Status
const allowedStatuses = getAllowedTransitions('In Planung');
// → ['In Planung', 'Freigegeben für Moodle']

// Prüfen ob Übergang erlaubt ist
const canTransition = isValidTransition('In Planung', 'Freigegeben für Moodle');
// → true

// Ungültiger Übergang
const invalid = isValidTransition('Freigegeben für Moodle', 'Exportiert');
// → false (Status "Exportiert" nicht definiert)
```

---

## 3. UI-Integration der State Machine

### 3.1 Status-Dropdown nur mit erlaubten Werten

```jsx
// EinheitFormWithValidation.jsx - Status-Auswahl

const allowedStatuses = initialData?.freigabe_status
  ? getAllowedTransitions(initialData.freigabe_status)
  : STATUS_OPTIONS; // Alle beim Create

<select
  value={formData.freigabe_status}
  onChange={(e) => handleChange('freigabe_status', e.target.value)}
>
  {allowedStatuses.map((status) => (
    <option key={status} value={status}>
      {status}
    </option>
  ))}
</select>
```

**Beispiel**:
- **Einheit im Status "In Planung"**:
  - Dropdown zeigt: ["In Planung", "Freigegeben für Moodle"]
  - Benutzer kann beide wählen

- **Einheit im Status "Freigegeben für Moodle"**:
  - Dropdown zeigt: ["Freigegeben für Moodle", "In Planung"]
  - Benutzer kann beide wählen

### 3.2 Server-Side State Machine Check

```javascript
// secureApi.js - updateEinheit()

if (data.freigabe_status && currentEinheit?.freigabe_status) {
  if (!isValidTransition(currentEinheit.freigabe_status, data.freigabe_status)) {
    const error = new SecureApiError(
      400,
      `Ungültiger Status-Übergang: "${currentEinheit.freigabe_status}" → "${data.freigabe_status}"`
    );
    throw error;
  }
}
```

**Ablauf**:
1. Frontend zeigt nur erlaubte Status im Dropdown
2. User wählt Status + speichert
3. Frontend sendet Update zu Backend
4. **Backend prüft nochmal**: Ist dieser Übergang erlaubt?
5. Falls nicht: HTTP 400 + Error-Message

---

## 4. Backend-Extension (Optional)

Für vollständige Datenintegrität: Validierung auch im Backend.

### 4.1 Backend Validierung (`functions/createEinheitSecure.js`)

```javascript
import { validateEntity, EINHEIT_SCHEMA } from '@/lib/validationSchemas';

Deno.serve(async (req) => {
  const payload = await req.json();
  
  // Backend-Validierung (gleiche Logik wie Frontend)
  const validation = validateEntity(payload, EINHEIT_SCHEMA);
  if (!validation.valid) {
    return Response.json(
      {
        error: 'Validation failed',
        details: validation.errors
      },
      { status: 400 }
    );
  }

  // ✅ Validierung passed → Speichern
  const einheit = await base44.asServiceRole.entities.Einheiten.create(payload);
  return Response.json({ success: true, data: einheit });
});
```

---

## 5. Error Handling im Frontend

```javascript
const mutation = useMutation({
  mutationFn: async (data) => secureApi.createEinheit(data),
  
  onError: (error) => {
    if (error instanceof SecureApiError) {
      // Validierungsfehler mit Field-Level Details
      if (error.validationErrors) {
        setValidationErrors(error.validationErrors);
        toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
      }
      // Andere Fehler
      else if (error.status === 400) {
        toast.error(error.message); // "Ungültiger Status-Übergang..."
      }
    }
  }
});
```

---

## 6. Verwendungsbeispiel

### Szenario: Benutzer erstellt neue Einheit

```jsx
import EinheitFormWithValidation from '@/components/einheiten/EinheitFormWithValidation';

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowForm(true)}>
        Neue Einheit
      </button>

      <EinheitFormWithValidation
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(result) => {
          console.log('Einheit erstellt:', result);
        }}
      />
    </div>
  );
}
```

**Was passiert**:

1. ✅ User füllt Formular aus
2. ❌ User klickt "Speichern" ohne Titel
   - Frontend-Validierung: `validateEntity()` returns Errors
   - Feld wird rot markiert + Error-Text zeigt sich
   - Submit wird blockiert
3. ✅ User füllt Titel aus + klickt "Speichern"
   - Frontend-Validierung: `validateEntity()` passes
   - API-Call: `secureApi.createEinheit(data)`
   - Backend erhält Daten + validiert nochmal
   - ✅ Speichern erfolgreich
4. ❌ Falls Backend-Validierung fehlschlägt:
   - Fehler wird geworfen
   - UI zeigt Error-Toast
   - Validierungsfehler werden angezeigt

---

## 7. Zusammenfassung

| Aspekt | Lösung | Audit-Punkt |
|--------|--------|-------------|
| **Pflichtfelder** | `EINHEIT_SCHEMA` mit `required: true` | 9 |
| **Frontend-Validierung** | `validateEntity()` vor API-Call | 9 |
| **Field-Level Errors** | Error-Objekt mit `{ [fieldName]: message }` | 9 |
| **Status-Übergänge** | `isValidTransition()` + State Machine | 10 |
| **UI-Beschränkungen** | Dropdown zeigt nur erlaubte Status | 10 |
| **Server-Validation** | Backend prüft nochmal (Defense in Depth) | 9 + 10 |
| **Error Handling** | Spezifische Toast + Field-Level Display | 9 + 10 |

---

## 8. Testing

```javascript
// Validierungen testen
import { validateEntity, EINHEIT_SCHEMA } from '@/lib/validationSchemas';

test('rejects missing required fields', () => {
  const result = validateEntity({ fach: 'Mathematik' }, EINHEIT_SCHEMA);
  expect(result.valid).toBe(false);
  expect(result.errors.titel_der_einheit).toBeDefined();
});

test('accepts valid data', () => {
  const result = validateEntity({
    titel_der_einheit: 'Grundrechenarten',
    fach: 'Mathematik',
    jahrgangsstufe: '5',
  }, EINHEIT_SCHEMA);
  expect(result.valid).toBe(true);
});

// State Machine testen
import { isValidTransition } from '@/lib/stateMachine';

test('allows valid transition', () => {
  expect(isValidTransition('In Planung', 'Freigegeben für Moodle')).toBe(true);
});

test('rejects invalid transition', () => {
  expect(isValidTransition('Freigegeben für Moodle', 'Ungültig')).toBe(false);
});
```

---

## ✅ Checklist Phase 6.6

- [x] Schema-Validierung definiert (`EINHEIT_SCHEMA`, etc.)
- [x] Frontend-Validierung vor API-Call (`validateEntity()`)
- [x] Field-Level Errors in UI angezeigt
- [x] State Machine für Status-Übergänge (`stateMachine.js`)
- [x] UI zeigt nur erlaubte Status (`getAllowedTransitions()`)
- [x] Backend validiert auch (Optional, für Defense in Depth)
- [x] Error Handling mit spezifischen Meldungen
- [x] Testabdeckung vorbereitet