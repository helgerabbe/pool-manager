# KI-Serien-Generator: Integration & Verwendung

## 📋 Features

- **Backend**: Edge Function `generateBulkAufgabenSecure.js` nutzt InvokeLLM für strukturierte Aufgaben-Generierung
- **Frontend**: 3-Step Modal (Input → Loading → Review) mit Edit-Funktionalität
- **Speicherung**: Batch-Create via `createBulkAufgaben()` 
- **Audit**: Alle Generierungen werden im AuditLog geloggt

---

## 🔧 Integration in Komponente

```jsx
import BulkGeneratorModal from '@/components/aufgaben/BulkGeneratorModal';

export default function AufgabenDetailView({ aufgabe, lernpaket }) {
  const [showBulkGenerator, setShowBulkGenerator] = useState(false);

  return (
    <div>
      <h1>{aufgabe.aufgabentext_inhalt}</h1>
      
      <button 
        onClick={() => setShowBulkGenerator(true)}
        className="gap-2 flex items-center"
      >
        ✨ Varianten generieren
      </button>

      <BulkGeneratorModal
        open={showBulkGenerator}
        onOpenChange={setShowBulkGenerator}
        masterAufgabe={aufgabe}
        lernziel={lernpaket.formulierung_fachsprache}
        fach={aufgabe.fach}
        jahrgangsstufe={aufgabe.jahrgangsstufe}
        lernpaketId={lernpaket.id}
        lernzielId={aufgabe.lernziel_id}
        onSuccess={(result) => {
          console.log('Varianten gespeichert:', result);
        }}
      />
    </div>
  );
}
```

---

## 📝 Props für `BulkGeneratorModal`

| Prop | Type | Required | Beschreibung |
|------|------|----------|-------------|
| `open` | boolean | ✅ | Dialog offen/geschlossen |
| `onOpenChange` | function | ✅ | Dialog-State Handler |
| `masterAufgabe` | object | ✅ | { aufgabentext_inhalt, erwartungshorizont_ki_prompt, ... } |
| `lernziel` | string | ❌ | Ziel-Formulierung für KI |
| `fach` | string | ✅ | Fach (z.B. "Mathematik") |
| `jahrgangsstufe` | string | ✅ | Jahrgang (z.B. "5") |
| `lernpaketId` | string | ✅ | FK zum Lernpaket |
| `lernzielId` | string | ❌ | FK zum Lernziel |
| `onSuccess` | function | ❌ | Callback nach erfolgreicher Speicherung |

---

## 🔄 Workflow

### Step 1: Anzahl eingeben
```
Slider: 1-20 Varianten
Button: "Generieren" → Ruft generateBulkAufgabenSecure() auf
```

### Step 2: KI generiert
```
- Backend empfängt master_aufgabe_text + Kontext
- LLM generiert JSON-Array
- Skeleton-Loading während Generierung
```

### Step 3: Review & Edit
```
- Liste mit generierten Aufgaben
- Checkboxes (default: alle selected)
- Edit-Button für jede Aufgabe
- Button: "X Aufgaben speichern" → Batch-Create
```

---

## 🛠️ Backend API

### `generateBulkAufgabenSecure.js`

**Endpoint**: `POST /functions/generateBulkAufgabenSecure`

**Request**:
```javascript
{
  master_aufgabe_text: "Löse: 5 + 3 = ?",
  loesung_text: "8",
  lernziel: "Addieren im Zahlenraum bis 10",
  fach: "Mathematik",
  jahrgangsstufe: "1",
  anzahl: 10
}
```

**Response**:
```javascript
{
  success: true,
  generated_tasks: [
    {
      aufgabentext: "Löse: 4 + 2 = ?",
      loesung: "6"
    },
    {
      aufgabentext: "Löse: 3 + 4 = ?",
      loesung: "7"
    },
    // ... 10 Varianten insgesamt
  ],
  metadata: {
    count: 10,
    fach: "Mathematik",
    jahrgangsstufe: "1",
    generated_at: "2026-04-01T10:30:00Z"
  }
}
```

---

## 📚 Frontend API (`secureApi.js`)

### `generateBulkAufgaben(payload)`
```javascript
const result = await secureApi.generateBulkAufgaben({
  master_aufgabe_text: "...",
  loesung_text: "...",
  fach: "Mathematik",
  jahrgangsstufe: "5",
  anzahl: 10
});
// → returns { generated_tasks: [...], metadata: {...} }
```

### `createBulkAufgaben(aufgaben)`
```javascript
const result = await secureApi.createBulkAufgaben([
  {
    lernpaket_id: "uuid-123",
    baustein_typ: "Ebene-1-Übung",
    aufgabentext_inhalt: "...",
    erwartungshorizont_ki_prompt: "...",
    schwierigkeitsgrad: "1-Stern"
  },
  // ... mehr Aufgaben
]);
// → returns { success: true, created_count: 10 }
```

---

## 🎯 Validierung

### Frontend (secureApi.js)
```javascript
- anzahl zwischen 1-20
- master_aufgabe_text + loesung_text erforderlich
- fach + jahrgangsstufe erforderlich
```

### Backend (generateBulkAufgabenSecure.js)
```javascript
- Payload-Validierung (400 Bad Request falls ungültig)
- LLM Response-Check (500 LLM Error falls fehlgeschlagen)
- JSON-Array-Struktur erzwungen via response_json_schema
```

---

## ⚠️ Fehlerbehebung

### "LLM generation failed"
- LLM antwortet nicht strukturiert
- System-Prompt ist zu vage
- Netzwerkfehler zum LLM

**Lösung**: 
- Prüfe LLM-API-Status
- Test via `test_backend_function` tool

### "Invalid response format"
- LLM antwortet nicht als JSON-Array
- Response-Schema nicht erfüllt

**Lösung**:
- Backend nutzt `response_json_schema` um Antwort zu erzwingen
- Falls noch nicht passend: Passe System-Prompt an

### "createBulkAufgaben failed"
- Fehlende Required-Felder in Aufgaben-Objekten
- Lernpaket/Lernziel nicht vorhanden

**Lösung**:
- Prüfe ob `lernpaketId` existiert
- Validiere Aufgaben vor Speicherung

---

## 📊 Audit-Logging

Jede Generierung wird im `AuditLog` geloggt:

```javascript
{
  user_email: "lehrer@schule.de",
  action: "CREATE",
  resource_type: "Aufgabenvarianten",
  resource_id: "bulk-generation",
  changes: {
    master_aufgabe_text: "Löse: 5 + 3 = ? ...",
    anzahl_generiert: 10,
    fach: "Mathematik",
    jahrgangsstufe: "1"
  },
  affected_count: 10,
  status: "success"
}
```

---

## 🚀 Tipps für Nutzer

1. **Master-Aufgabe präzise formulieren**
   - Struktur beibehalten (Textaufgabe → bleibt Textaufgabe)
   - Kontext klar machen

2. **Lösung / KI-Prompt gut schreiben**
   - Erwartungshorizont zeigt dem LLM die Qualität
   - Wird als Muster für Varianten genutzt

3. **Generierte Aufgaben reviewen**
   - Modal erlaubt Edit bevor sie gespeichert werden
   - Prüfe auf Didaktik-Konsistenz

4. **Nicht zu viele auf einmal**
   - 10-15 Varianten sind realistisch
   - 20 können repetitiv werden

---

## 🔒 Sicherheit

- ✅ Nur authentifizierte Nutzer
- ✅ Audit-Logging aller Generierungen
- ✅ Input-Validierung (Payload + LLM Response)
- ✅ Error-Handling ohne Daten-Leaks
- ✅ Rate-Limiting via Base44 Integrations-Credits