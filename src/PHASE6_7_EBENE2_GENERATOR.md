# Phase 6.7: KI-Generator für Ebene 2 (Transfer/Anwendungsaufgaben)

## 📋 Übersicht

Erweiterung des Bulk-Generators auf Ebene 2 Aufgaben mit spezifischem LLM-Prompt und generischer UI-Integration.

---

## 1. Backend: `generateBulkEbene2Secure.js`

### Neue Funktion
- **Datei**: `src/functions/generateBulkEbene2Secure.js`
- **Payload-Struktur**:
  ```js
  {
    master_aufgabe_text: "...",
    loesung_text: "...",
    themenfeld: "Zahlentheorie",           // Optional
    kompetenzen: "Analysieren, Bewerten",  // Optional
    schwierigkeitsgrad: "2-Sterne",        // Optional
    fach: "Mathematik",
    jahrgangsstufe: "10",
    anzahl: 10
  }
  ```

### LLM System-Prompt (Ebene 2)
```
Du bist ein erfahrener Pädagoge, spezialisiert auf Ebene 2 Aufgaben 
(Transfer- und Anwendungsaufgaben).

- Erstelle Varianten mit GLEICHER Schwierigkeit & Komplexität
- Verwende UNTERSCHIEDLICHE aber thematisch ÄQUIVALENTE Kontexte
- Achte auf die gleichen kognitiven Operatoren (Analysieren, Bewerten, etc.)
- Jede Variante testet Transfer-Fähigkeiten, nicht nur Faktenwissen
- Strukturierte, nachvollziehbare Lösungen
```

### Output-Format
```json
[
  {
    "aufgabentext": "Vollständige Aufgabenstellung...",
    "loesung": "Strukturierte Lösungsskizze mit Erwartungen..."
  }
]
```

---

## 2. Frontend API: `secureApi.js`

### Neue Export-Funktion
```javascript
/**
 * Bulk-Aufgaben-Generator für Ebene 2
 */
export async function generateBulkEbene2(payload) {
  if (!payload?.master_aufgabe_text || !payload?.fach || !payload?.anzahl) {
    throw new Error('Missing required fields');
  }

  try {
    const response = await base44.functions.invoke(
      'generateBulkEbene2Secure',
      payload
    );
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const message = error.response?.data?.error || error.message;
    throw new SecureApiError(status, message);
  }
}
```

---

## 3. Frontend UI: Generische `BulkGeneratorModal`

### Neue Props für Flexibilität
```jsx
<BulkGeneratorModal
  open={open}
  onOpenChange={setOpen}
  masterAufgabe={aufgabe}
  lernpaketId="id123"
  fach="Mathematik"
  jahrgangsstufe="10"
  
  // Neu: Generisches Design
  entityType="ebene2"          // 'ebene1' | 'ebene2'
  contextData={{
    themenfeld: "Zahlentheorie",
    kompetenzen: "Analysieren, Bewerten",
    schwierigkeitsgrad: "2-Sterne",
  }}
  invalidateKeys={[['ebene2_aufgaben', paketId]]}
  onSuccess={(data) => { ... }}
/>
```

### Interne Logik
- **Step 1 (Input)**: Schieberegler für `anzahl` (1-20)
- **Step 2 (Loading)**: Skeleton-Reihen während LLM generiert
- **Step 3 (Review)**: Edit & Speichern (mit Checkboxes für Selektion)

```javascript
// Ebene 2 Generierung
if (entityType === 'ebene2') {
  return secureApi.generateBulkEbene2({
    ...basePayload,
    themenfeld: contextData.themenfeld,
    kompetenzen: contextData.kompetenzen,
    schwierigkeitsgrad: contextData.schwierigkeitsgrad,
  });
}
```

---

## 4. Integration: `Ebene2GeneratorButton.jsx`

### Button-Komponente für Ebene 2
```jsx
import Ebene2GeneratorButton from '@/components/aufgaben/Ebene2GeneratorButton';

<Ebene2GeneratorButton
  masterAufgabe={aufgabe}
  lernpaketId={paketId}
  themenfeld="Zahlentheorie"
  kompetenzen="Analysieren, Bewerten"
  schwierigkeitsgrad="2-Sterne"
  fach="Mathematik"
  jahrgangsstufe="10"
  onSuccess={() => refetch()}
/>
```

### Features
- ✨ Icon + Text ("✨ Varianten generieren")
- Öffnet generische Modal mit `entityType="ebene2"`
- Invalidiert spezifische React Query Keys nach Speichern
- Responsive Button-Größe (`size="sm"`)

---

## 5. React Query Invalidation

### Automatische Cache-Invalidation
```javascript
// Nach erfolgreichem Speichern
queryClient.invalidateQueries({ queryKey: ['aufgaben'] });           // Global
queryClient.invalidateQueries({ queryKey: ['lernpakete'] });         // Global
queryClient.invalidateQueries({ queryKey: ['ebene2_aufgaben', id] }); // Spezifisch
```

### Konfigurierbar via `invalidateKeys` Prop
```jsx
invalidateKeys={[
  ['ebene2_aufgaben', paketId],
  ['aufgaben_detail', aufgabeId],
]}
```

---

## 6. Workflow-Beispiel (Ebene 2)

```jsx
// In einer Ebene 2 Aufgaben-Detail-View
import Ebene2GeneratorButton from '@/components/aufgaben/Ebene2GeneratorButton';

export default function Ebene2AufgabeDetail({ aufgabe, paket, themenfeld }) {
  const { refetch } = useQuery(['ebene2_aufgaben', paket.id], ...);

  return (
    <div className="space-y-4">
      <h1>{aufgabe.aufgabentext_inhalt}</h1>
      
      {/* Generieren-Button */}
      <Ebene2GeneratorButton
        masterAufgabe={aufgabe}
        lernpaketId={paket.id}
        themenfeld={themenfeld.titel}
        kompetenzen={aufgabe.kompetenzen || 'Transfer, Analyse'}
        schwierigkeitsgrad={aufgabe.schwierigkeitsgrad}
        fach={paket.fach}
        jahrgangsstufe={paket.jahrgangsstufe}
        onSuccess={() => refetch()}
      />

      {/* Generierte Aufgaben anzeigen */}
      {/* ... */}
    </div>
  );
}
```

---

## 7. Checklist Phase 6.7 Ebene 2

- ✅ Backend-Funktion `generateBulkEbene2Secure.js` mit Ebene 2 LLM-Prompt
- ✅ API-Export `generateBulkEbene2()` in `secureApi.js`
- ✅ Generische Props für `BulkGeneratorModal` (`entityType`, `contextData`)
- ✅ Automatische Baustein-Typ-Anpassung (Ebene-1-Übung vs. Ebene-2-Aufgabe)
- ✅ `invalidateKeys` für spezifische React Query Invalidation
- ✅ Button-Komponente `Ebene2GeneratorButton.jsx`
- ✅ Design Tokens (keine Hardcoded-Farben)
- ⏳ Integration in bestehende Ebene 2 UI-Komponenten

---

✅ Phase 6.7: KI-Generator für Ebene 2 ready (generisch, erweiterbar, typed).