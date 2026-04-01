# Phase 6.6: Zod + react-hook-form Validierungsintegration

## 📋 Überblick

Nutzt **Zod** für zentrale, type-safe Schema-Definition und **react-hook-form** für effiziente Frontend-Formular-Validierung mit minimalen Re-Renders.

**Installierte Packages**:
- `zod ^3.24.2` ✅
- `react-hook-form ^7.54.2` ✅
- `@hookform/resolvers ^4.1.2` ✅

---

## 1. Zentrale Schema-Definition (`src/utils/validationSchemas.js`)

```javascript
import { z } from 'zod';

// Enums
const FAECHER = [...] as const;
const JAHRGAENGE = ['5', '6', ...] as const;

// Schema Definition
export const EinheitSchema = z.object({
  titel_der_einheit: z
    .string()
    .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
    .max(200, 'Titel darf maximal 200 Zeichen lang sein')
    .trim(),
  
  fach: z.enum(FAECHER, {
    errorMap: () => ({ message: 'Bitte wählen Sie ein gültiges Fach aus' }),
  }),
  
  jahrgangsstufe: z.enum(JAHRGAENGE),
  
  gesamtziel: z.string().max(1000).optional().or(z.literal('')),
});

export type EinheitFormData = z.infer<typeof EinheitSchema>;
```

**Vorteile**:
- ✅ Type-safe: `EinheitFormData` Type wird automatisch inferred
- ✅ Zentrale Error-Messages
- ✅ Wiederverwendbar im Frontend + Backend
- ✅ Aussagekräftige Fehlermeldungen für UI

---

## 2. Frontend-Integration (`EinheitFormWithZod.jsx`)

### useForm mit zodResolver

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EinheitSchema } from '@/utils/validationSchemas';

export default function EinheitFormWithZod({ initialData }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(EinheitSchema),  // ← Zod Validierung
    defaultValues: {
      titel_der_einheit: initialData?.titel_der_einheit || '',
      fach: initialData?.fach || '',
      jahrgangsstufe: initialData?.jahrgangsstufe || '',
      gesamtziel: initialData?.gesamtziel || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Felder mit Error-Display */}
    </form>
  );
}
```

### Field-Level Error Display

```jsx
const FormField = ({ label, name, required = true }) => {
  const error = errors[name];

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <Input
        id={name}
        {...register(name)}
        className={error ? 'border-red-300 bg-red-50' : ''}
      />

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>  {/* ← Zod Error-Message */}
        </div>
      )}
    </div>
  );
};
```

### onSubmit erst nach Validierung

```javascript
const onSubmit = (data) => {
  // data ist hier GARANTIERT valid (Zod hat bereits validiert)
  mutation.mutate(data);
};

// Validierung läuft VOR onSubmit
const form = useForm({ resolver: zodResolver(EinheitSchema) });
const submit = form.handleSubmit(onSubmit); // ← Validiert vor onSubmit
```

---

## 3. Backend-Validierung (`functions/createEinheitSecure.js`)

### Defense in Depth: Backend validiert auch

```javascript
// Strikte Backend-Validierung (Mirror der Frontend Zod Schemas)
function validateEinheitPayload(data) {
  const errors = {};

  // titel_der_einheit: required, min 3, max 200
  if (!data.titel_der_einheit?.trim()) {
    errors.titel_der_einheit = 'Titel ist erforderlich';
  } else if (data.titel_der_einheit.trim().length < 3) {
    errors.titel_der_einheit = 'Titel muss mindestens 3 Zeichen lang sein';
  } else if (data.titel_der_einheit.length > 200) {
    errors.titel_der_einheit = 'Titel darf maximal 200 Zeichen lang sein';
  }

  // fach: required, enum
  const VALID_FAECHER = ['Deutsch', 'Mathematik', ...];
  if (!data.fach || !VALID_FAECHER.includes(data.fach)) {
    errors.fach = 'Bitte wählen Sie ein gültiges Fach aus';
  }

  // jahrgangsstufe: required, enum
  const VALID_JAHRGAENGE = ['5', '6', ...];
  if (!data.jahrgangsstufe || !VALID_JAHRGAENGE.includes(String(data.jahrgangsstufe))) {
    errors.jahrgangsstufe = 'Bitte wählen Sie eine gültige Jahrgangsstufe aus';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

Deno.serve(async (req) => {
  // ...
  
  // Backend-Validierung vor DB-Operation
  const validation = validateEinheitPayload(payload);
  if (!validation.valid) {
    return Response.json(
      { error: 'Validation failed', details: validation.errors },
      { status: 400 }
    );
  }

  // ✅ Validierung passed → Create
  const newEinheit = await base44.entities.Einheiten.create(payload);
  // ...
});
```

---

## 4. Verwendungsbeispiel

```jsx
import EinheitFormWithZod from '@/components/einheiten/EinheitFormWithZod';
import { useState } from 'react';

export default function Dashboard() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowForm(true)}>
        Neue Einheit
      </button>

      <EinheitFormWithZod
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={(result) => {
          console.log('Einheit erstellt:', result);
        }}
      />
    </div>
  );
}
```

### Workflow

1. **Nutzer füllt Formular aus**
   - Text wird in State gespeichert
   - Kein Validierungs-Overhead

2. **Nutzer klickt "Speichern"**
   - `handleSubmit(onSubmit)` triggert Validierung
   - Zod validiert gegen `EinheitSchema`

3. **Validierung fehlgeschlagen**
   - ❌ `onSubmit` wird NICHT aufgerufen
   - ❌ Errors in `errors` Objekt
   - ❌ UI zeigt Fehlermeldungen neben Feldern

4. **Validierung erfolgreich**
   - ✅ `onSubmit(data)` wird mit validierten Daten aufgerufen
   - ✅ Frontend sendet zu Backend via `secureApi.createEinheit(data)`
   - ✅ Backend validiert nochmal (Defense in Depth)

5. **Backend Validierung fehlgeschlagen**
   - ❌ HTTP 400 + Error-Details
   - ❌ Frontend zeigt Toast-Error

---

## 5. Schemata-Helpers für Dropdowns

```javascript
// validationSchemas.js
export const SchemaHelpers = {
  getFaecher: () => Array.from(FAECHER),
  getJahrgaenge: () => Array.from(JAHRGAENGE),
  getFreigabeStati: () => Array.from(FREIGABE_STATI),
};

// In Komponente
import { SchemaHelpers } from '@/utils/validationSchemas';

<select {...register('fach')}>
  {SchemaHelpers.getFaecher().map(f => (
    <option key={f} value={f}>{f}</option>
  ))}
</select>
```

---

## 6. Type Safety

```javascript
// Automatischer Type-Inference
export type EinheitFormData = z.infer<typeof EinheitSchema>;

// In Komponente
const onSubmit = (data: EinheitFormData) => {
  // data.titel_der_einheit ist garantiert string
  // data.fach ist garantiert eines der Enums
  // TS-Error falls auf nicht-existentes Feld zugegriffen wird
  mutation.mutate(data);
};
```

---

## 7. Zusammenfassung

| Aspekt | Lösung |
|--------|--------|
| **Zentrale Schemas** | `validationSchemas.js` mit Zod |
| **Frontend-Validierung** | `react-hook-form` + `zodResolver` |
| **Error-Display** | Field-Level Errors aus `errors` Objekt |
| **Type Safety** | `z.infer<typeof Schema>` |
| **Backend-Validierung** | Strikte Checks (Mirror der Frontend Schemas) |
| **HTTP Status** | 400 Bad Request falls Validierung fehlschlägt |
| **Security** | Defense in Depth: Frontend + Backend validieren |

---

## 8. Vorbereitung für weitere Schemas

```javascript
// AufgabeSchema
export const AufgabeSchema = z.object({
  aufgabentext_inhalt: z.string().min(5),
  baustein_typ: z.enum([...]),
  // ...
});

// LernpaketSchema
export const LernpaketSchema = z.object({
  titel_des_pakets: z.string().min(3),
  // ...
});

// Alle Schemas zentral verwaltet
export const schemas = {
  EinheitSchema,
  AufgabeSchema,
  LernpaketSchema,
};
```

Können leicht in neuen Formularen mit `zodResolver(AufgabeSchema)` verwendet werden.

---

✅ Phase 6.6 complete: Zod + react-hook-form fully integrated.