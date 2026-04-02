# PublishTaskButton Integration Guide

## Überblick

`PublishTaskButton` ersetzt den bisherigen Freigabe-Toggle durch einen prominenten Button mit Validierungs- und Override-Logik.

**Features:**
- ✅ Zod-Schema-basierte Validierung
- ✅ Force-Publish mit Auto-Fill von Fallback-Werten
- ✅ Transparente Fehlerauflistung im Modal
- ✅ URL-Field-Erkennung für intelligente Fallbacks
- ✅ Master & Klon Support

---

## Komponenten-Props

```typescript
interface PublishTaskButtonProps {
  item: Record<string, any>;           // Das Aufgaben-Objekt (Master oder Klon)
  itemType: 'master' | 'klon';         // Bestimmt die Entity (MasterAufgabe vs. Aufgabenbausteine)
  schema: z.ZodType;                   // Zod-Schema zur Validierung
  onSuccess?: () => void;              // Callback nach erfolgreichem Speichern
  className?: string;                  // Zusätzliche Tailwind-Klassen
}
```

---

## Verwendungsbeispiele

### 1. In einem Klon-Detail-Formular (KlonDetailView)

```jsx
import PublishTaskButton from '@/components/aufgaben/PublishTaskButton';
import { KlonSchema } from '@/schemas/aufgaben';

export default function KlonDetailView({ klonData, klonId }) {
  const [formData, setFormData] = useState(klonData);

  return (
    <div className="space-y-4">
      {/* Formular-Felder */}
      <input 
        value={formData.titel} 
        onChange={(e) => setFormData({ ...formData, titel: e.target.value })} 
      />

      {/* Freigabe-Button */}
      <PublishTaskButton
        item={formData}
        itemType="klon"
        schema={KlonSchema}
        onSuccess={() => {
          console.log('Klon freigegeben!');
          // Navigation oder Cache-Invalidierung
        }}
      />
    </div>
  );
}
```

### 2. In einem Master-Aufgaben-Formular

```jsx
import PublishTaskButton from '@/components/aufgaben/PublishTaskButton';
import { MasterAufgabeSchema } from '@/schemas/aufgaben';

export default function MasterAufgabeEditor({ masterData }) {
  const [formData, setFormData] = useState(masterData);

  return (
    <div className="space-y-4">
      {/* Formular-Felder */}
      <textarea 
        value={formData.aufgabenstellung} 
        onChange={(e) => setFormData({ ...formData, aufgabenstellung: e.target.value })} 
      />

      {/* Freigabe-Button */}
      <PublishTaskButton
        item={formData}
        itemType="master"
        schema={MasterAufgabeSchema}
        onSuccess={() => {
          // Cache invalidieren oder UI updaten
        }}
        className="w-full"
      />
    </div>
  );
}
```

### 3. Zod-Schema Definition

```typescript
// schemas/aufgaben.ts
import { z } from 'zod';

export const KlonSchema = z.object({
  titel: z.string().min(3, 'Mindestens 3 Zeichen'),
  aufgabenstellung: z.string().min(10, 'Mindestens 10 Zeichen'),
  anleitung_url: z.string().url('Gültige URL erforderlich'),
  loesungshinweise: z.string().optional(),
});

export const MasterAufgabeSchema = z.object({
  titel: z.string().min(3, 'Mindestens 3 Zeichen'),
  aufgabenstellung: z.string().min(10, 'Mindestens 10 Zeichen'),
  feld_1: z.string().min(3, 'Mindestens 3 Zeichen'),
  feld_2: z.string().min(3, 'Mindestens 3 Zeichen'),
});
```

---

## Validierungs- & Override-Flow

### Flow A: Validierung erfolgreich

```
Nutzer klickt "Für Export freigeben"
           ↓
schema.safeParse(item) → SUCCESS
           ↓
Update mit content_status: 'approved'
           ↓
Success-Toast + onSuccess() Callback
```

### Flow B: Validierung fehlgeschlagen

```
Nutzer klickt "Für Export freigeben"
           ↓
schema.safeParse(item) → ERROR
           ↓
AlertDialog zeigt fehlende Felder
           ↓
Nutzer wählt "Trotzdem freigeben"
           ↓
injectFallbacks() → Lücken füllen
           ↓
Update mit content_status: 'approved' + Fallbacks
           ↓
Success-Toast + onSuccess() Callback
```

---

## Fallback-Logik

### URL-Felder
- **Erkannt durch:** Feldname enthält 'url' oder 'link'
- **Fallback-Wert:** `https://www.link-folgt.de`

### Text-Felder
- **Erkannt durch:** Alle anderen String-Felder
- **Fallback-Wert:** `[Information wird noch ergänzt]`

### Beispiel: Fallback-Injection

```typescript
// Input:
const item = {
  titel: 'Meine Aufgabe',
  aufgabenstellung: '',           // ← Fehlt
  anleitung_url: '',              // ← Fehlt (URL-Feld)
  loesungshinweise: 'Hinweis...'
};

const zodErrors = [
  { path: ['aufgabenstellung'], message: 'too_small' },
  { path: ['anleitung_url'], message: 'invalid_string' }
];

// Fallback-Injection:
injectFallbacks(item, zodErrors) → {
  titel: 'Meine Aufgabe',
  aufgabenstellung: '[Information wird noch ergänzt]',  // ← Fallback für Text
  anleitung_url: 'https://www.link-folgt.de',          // ← Fallback für URL
  loesungshinweise: 'Hinweis...'
}
```

---

## Best Practices

### 1. Immer ein Schema bereitstellen

```jsx
// ✅ Gut
<PublishTaskButton
  item={formData}
  schema={MeinSchema}
  itemType="klon"
/>

// ❌ Schlecht
<PublishTaskButton
  item={formData}
  schema={null}
  itemType="klon"
/>
```

### 2. Schema und Form-State synchronisieren

```jsx
// ✅ Gut - Schema und Felder sind synchron
const MySchema = z.object({ titel: z.string(), aufgabenstellung: z.string() });
const [form, setForm] = useState({ titel: '', aufgabenstellung: '' });

// ❌ Schlecht - Schema und Felder unterscheiden sich
const MySchema = z.object({ titel: z.string(), aufgabenstellung: z.string() });
const [form, setForm] = useState({ name: '', description: '' });
```

### 3. onSuccess Callback nutzen

```jsx
// ✅ Gut - Cache und UI updaten
<PublishTaskButton
  item={formData}
  itemType="klon"
  schema={schema}
  onSuccess={() => {
    // Query Cache invalidieren
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
    // Navigation
    navigate('/aufgaben');
  }}
/>
```

### 4. ItemType korrekt setzen

```jsx
// ✅ Klon
<PublishTaskButton item={klonData} itemType="klon" schema={schema} />

// ✅ Master
<PublishTaskButton item={masterData} itemType="master" schema={schema} />
```

---

## Erweiterung: Eigene Fallback-Logik

Falls du spezielle Fallback-Logik für bestimmte Felder benötigst, kannst du `injectFallbacks` anpassen:

```typescript
// components/aufgaben/PublishTaskButton.jsx - Modify injectFallbacks

function injectFallbacks(item, zodErrors) {
  const filled = { ...item };

  zodErrors.forEach((issue) => {
    const fieldPath = issue.path[0];
    if (!fieldPath) return;

    // Benutzerdefinierte Logik pro Feld
    if (fieldPath === 'kontakt_email') {
      filled[fieldPath] = 'keine-email-angegeben@example.com';
    } else if (fieldPath.includes('url') || fieldPath.includes('link')) {
      filled[fieldPath] = 'https://www.link-folgt.de';
    } else {
      filled[fieldPath] = '[Information wird noch ergänzt]';
    }
  });

  return filled;
}
```

---

## Troubleshooting

### Problem: Modal zeigt sich nicht nach Validierungsfehler

**Lösung:** Stelle sicher, dass das Schema die richtigen Feldnamen hat:

```jsx
// ❌ Schema hat andere Feldnamen als item
const schema = z.object({ name: z.string() });
const item = { titel: 'Mein Titel' }; // Feldname passt nicht

// ✅ Feldnamen müssen matchen
const schema = z.object({ titel: z.string() });
const item = { titel: 'Mein Titel' };
```

### Problem: Fallback-Wert wird nicht injiziert

**Lösung:** URL-Felder müssen im Namen 'url' oder 'link' enthalten:

```jsx
// ❌ Feld wird nicht als URL erkannt
const item = { lernmaterial_pfad: '' };

// ✅ Feld wird als URL erkannt
const item = { lernmaterial_url: '' };
```

---

## Komplettes Beispiel: Integration in bestehende Component

Siehe `AufgabePublishExample.jsx` für ein produktives Beispiel mit:
- Vollständigem Formular
- Zwei verschiedenen Schemas (Link-Aufgabe & Text-Aufgabe)
- Validierungs-Feedback pro Feld
- PublishTaskButton Integration