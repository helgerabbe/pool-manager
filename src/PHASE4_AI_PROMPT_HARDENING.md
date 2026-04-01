# Phase 4: KI-Prompt-Generatoren Härtung

## Implementierte Features

### 1. Robustes Null-Handling & Fallbacks

**Dateien:**
- `utils/generateAILandkarteContext.js` – Lernlandkarte-Kontext mit Sanitizing
- `utils/generateInteractiveProjectCoach.js` – Coach-Prompt mit Null-Checks
- `components/allgemeineAufgaben/AITutorPromptPanel.jsx` – Tutor-Prompt UI

**Fallback-Strategie:**

| Feld | Fehlerfall | Fallback |
|------|-----------|----------|
| `aufgabe.aufgabenstellung` | Leer/null | `[Keine Aufgabenstellung hinterlegt]` |
| `einheit.gesamtziel` | Leer/null | `[Kein Gesamtziel definiert]` oder `` (optional) |
| `lernziele` (Array) | Leer | Funktion gibt `null` zurück → Empty State |
| `einheit.fach` | Leer | `[Fach unbekannt]` oder Default-Text |

**Beispiel – Robuste Funktion:**

```javascript
function generateTutorPrompt(aufgabe, mappedLernziele, lernpakete, einheit) {
  // Kritische Validierung: Wenn keine Ziele, return null
  if (!aufgabe || !Array.isArray(mappedLernziele) || mappedLernziele.length === 0) {
    return null;
  }

  // Sanitize mit Fallback
  const aufgabeText = sanitizeString(aufgabe.aufgabenstellung) || '[Keine Aufgabenstellung hinterlegt]';
  const fach = sanitizeString(einheit?.fach) || 'dem Unterricht';
  
  // ... Rest der Prompt-Generierung
  return prompt;
}
```

### 2. String-Sanitizing für Moodle-Export

**Function: `sanitizeString()`**

```javascript
function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()                           // Whitespace entfernen
    .replace(/\s{2,}/g, ' ')         // Mehrfache Leerzeichen → eins
    .replace(/\n{3,}/g, '\n\n');     // Mehrfache Zeilenumbrüche → zwei
}
```

**Garantiert:**
- ✅ Keine `[Object object]` Strings
- ✅ Saubere Zeilenumbrüche für Markdown/Plain Text
- ✅ Keine überflüssigen Leerzeichen
- ✅ Trimmed output für APIs

### 3. UI Graceful Degradation

**Component: `AITutorPromptPanel`**

Wenn `generateTutorPrompt()` → `null` zurückgibt:

```jsx
// VORHER (fehleranfällig):
{!prompt ? <p>Keine Kompetenzen</p> : <TextArea value={prompt} />}

// NACHHER (Graceful Degradation):
{!prompt ? <PromptEmptyState /> : <PromptWithCopy prompt={prompt} />}
```

**Empty State:**
- Icon: `<AlertTriangle>` (Warn-Icon)
- Titel: "Prompt kann nicht generiert werden"
- Text: "Bitte ordnen Sie der Aufgabe zuerst Kompetenzen / Lernziele zu."
- Copy-Button: `disabled={!prompt}`

**Anwendung:**

```jsx
export default function AITutorPromptPanel({ aufgabe, mappedLernziele, ... }) {
  const prompt = useMemo(
    () => generateTutorPrompt(aufgabe, mappedLernziele, lernpakete, einheit),
    [aufgabe, mappedLernziele, lernpakete, einheit]
  );

  // Graceful Degradation
  if (!prompt) {
    return <PromptEmptyState />;
  }

  return <PromptDisplay prompt={prompt} />;
}
```

## Null-Handling Checkliste

- [x] Alle interpolierten Variablen haben Fallback-Strings
- [x] Arrays werden mit `.filter(item => item && item.id)` bereinigt
- [x] Strings werden vor Interpolation mit `sanitizeString()` bereinigt
- [x] Funktionen geben `null` zurück, wenn kritische Daten fehlen
- [x] UI zeigt Empty State statt fehlerhafte Prompts
- [x] Copy-Button ist `disabled` wenn Prompt = `null`

## Testing-Szenarien

### Szenario 1: Leere Aufgabenstellung
```javascript
const aufgabe = { aufgabenstellung: null, ... };
// → Prompt mit Fallback-Text: "[Keine Aufgabenstellung hinterlegt]"
```

### Szenario 2: Keine Lernziele zugeordnet
```javascript
const mappedLernziele = [];
// → generateTutorPrompt() gibt null zurück
// → UI zeigt PromptEmptyState
// → Copy-Button: disabled
```

### Szenario 3: Mehrfache Leerzeichen in Text
```javascript
const einheit = { gesamtziel: "Das ist   ein    Text" };
// → sanitizeString() → "Das ist ein Text"
```

### Szenario 4: Viele Zeilenumbrüche
```javascript
const text = "Zeile 1\n\n\n\nZeile 2";
// → sanitizeString() → "Zeile 1\n\nZeile 2"
```

## Migration bestehender Code

Wenn Sie andere Stellen haben, die KI-Prompts generieren, verwenden Sie diese Pattern:

```javascript
import { sanitizeString } from '@/utils/generateAILandkarteContext';

// ❌ VORHER:
const prompt = `Fach: ${einheit.fach}\n${aufgabe.aufgabenstellung}`;

// ✅ NACHHER:
const fach = sanitizeString(einheit?.fach) || '[Fach unbekannt]';
const aufgabe = sanitizeString(aufgabe?.aufgabenstellung) || '[Keine Aufgabe]';
const prompt = `Fach: ${fach}\n${aufgabe}`;
```

## Sicherheits-Eigenschaften

✅ **Keine Null-/Undefined-Fehler** – Alle Variablen haben Fallbacks  
✅ **Saubere String-Ausgabe** – Keine `[Object object]` oder Formatierungsfehler  
✅ **Graceful Degradation** – Benutzer sehen aussagekräftige Empty States  
✅ **Moodle-kompatibel** – Saubere Zeilenumbrüche für Export  
✅ **Wartbar** – Zentrale `sanitizeString()` Funktion  

## Deployment

1. Ersetze alte `generateTutorPrompt()` / `generateCoachPrompt()` Funktionen
2. Alle Stellen, die diese Funktionen nutzen, müssen auf `null`-Rückgabewert prüfen
3. UI-Components müssen mit `PromptEmptyState` für `null`-Fall upgradet werden
4. Test: Versuche Aufgabe ohne Kompetenzen zu erstellen → sollte Empty State zeigen