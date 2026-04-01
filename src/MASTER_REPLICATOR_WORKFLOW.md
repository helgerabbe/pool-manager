# Master → Replicator Workflow (Phase 6.7)

## 📋 Übersicht

Vollständiger Workflow für **Human-in-the-Loop KI-gestützte Aufgabenreplikation**:
1. **Master erstellen** → Dynamisches Modal basierend auf Activity-Type
2. **Replikate generieren** → LLM mit Kontext-Prompt
3. **Einzeln überprüfen & speichern** → Human-in-the-Loop Review

---

## 1. Datenbank-Schema

### Erweiterte Felder in `Aufgabenbausteine.json`

```json
{
  "is_master": {
    "type": "boolean",
    "default": false,
    "description": "True = Dies ist eine Masteraufgabe für KI-Replikation"
  },
  "master_id": {
    "type": "string",
    "description": "UUID der Masteraufgabe (falls dieses Replikat)"
  },
  "export_to_moodle": {
    "type": "boolean",
    "default": true
  },
  "activity_type": {
    "type": "string",
    "description": "z.B. 'match_terms', 'free_text', 'quiz'"
  },
  "activity_config": {
    "type": "object",
    "description": "Strukturierte Activity-Konfiguration"
  }
}
```

### Beziehungen

```
Masteraufgabe (is_master: true)
    ├── Replikat 1 (master_id: <master.id>, is_master: false)
    ├── Replikat 2 (master_id: <master.id>, is_master: false)
    └── Replikat 3 (master_id: <master.id>, is_master: false)
```

---

## 2. Dynamisches Master-Modal

### Komponente: `MasterTaskModal.jsx`

**Features:**
- Activity-Type basierte Komponenten-Rendering (Platzhalter-Architektur)
- Mapping: `ACTIVITY_COMPONENTS = { match_terms: ..., free_text: ... }`
- Speichert als `is_master: true` ohne Replikationslogik

**Verwendung:**
```jsx
<MasterTaskModal
  open={open}
  onOpenChange={setOpen}
  lernpaketId="id123"
  lernzielId="id456"
  activityType="free_text"  // oder 'match_terms'
  contextData={{ fach: 'Deutsch', jahrgangsstufe: '10' }}
  onSuccess={(data) => refetch()}
/>
```

### Platzhalter-Komponenten

#### `MatchTermsPlaceholder.jsx`
```jsx
// Beschreibungsfeld für Begriffe-Zuordnung
// Lösungsskizze (z.B. "1492 → Kolumbus")
```

#### `FreeTextPlaceholder.jsx`
```jsx
// Vollständige Aufgabenstellung
// Erwartungshorizont/Lösungsskizze
```

**Neue Activity-Types hinzufügen:**
1. Erstelle `src/components/aufgaben/placeholders/YourActivityPlaceholder.jsx`
2. Registriere in `ACTIVITY_COMPONENTS` Mapping

---

## 3. Backend: Replikation via LLM

### Funktion: `generateReplicasSecure.js`

**Input-Payload:**
```json
{
  "master_id": "uuid-xxx",
  "anzahl": 10
}
```

**Workflow:**
1. Validiere Masteraufgabe (`is_master: true`)
2. Sammle Kontext: Lernpaket, Lernziel, Aktivitätstyp
3. Konstruiere System-Prompt (Activity-Type spezifisch)
4. Rufe LLM auf mit strukturiertem JSON-Schema
5. Validiere Replikate (Array mit `{aufgabentext, loesung}`)
6. Schreibe Audit-Log
7. Rückgabe: Array der generierten Replikate

**LLM System-Prompt:**
```
Du bist Pädagoge spezialisiert auf didaktisch gleichwertige Aufgabenvarianten.

KONTEXT:
- Aktivitätstyp: ${activity_type}
- Lernziel: ${lernziel.formulierung}
- Fach: ${lernpaket.fach}

TASK:
Erstelle ${anzahl} Varianten mit:
- GLEICHER Komplexität & Schwierigkeit
- UNTERSCHIEDLICHER aber äquivalenter Kontext
- GLEICHEM FORMAT & Struktur

RÜCKGABE: JSON-Array mit {aufgabentext, loesung}
```

**API-Aufruf (Frontend):**
```javascript
const result = await secureApi.generateReplicas(masterId, 10);
// result.replicas: Array von {aufgabentext, loesung}
```

---

## 4. Review Modal: Human-in-the-Loop

### Komponente: `ReplicaReviewModal.jsx`

**Zustände:**

#### State 1: Loading
```jsx
<ReplicaReviewModal
  isLoading={true}
  replicas={[]}
/>
```
→ Zeigt 3 Skeleton-Loader während LLM generiert

#### State 2: Success (Review)
```jsx
<ReplicaReviewModal
  isLoading={false}
  replicas={[
    { aufgabentext: "...", loesung: "..." },
    { aufgabentext: "...", loesung: "..." },
  ]}
/>
```
→ Liste mit editierbaren Replikaten, jedes mit eigenem Save-Button

#### State 3: Error
```jsx
<ReplicaReviewModal
  error="LLM did not generate valid replicas"
/>
```

**Pro Replikat:**
- Anzeige mit `aufgabentext` (line-clamp-2) + Lösung Preview
- **Button "Bearbeiten"** → öffnet Textarea für beide Felder
- **Button "Diese Aufgabe speichern"** → API-Call:
  ```javascript
  base44.entities.Aufgabenbausteine.create({
    lernpaket_id,
    lernziel_id,
    aufgabentext_inhalt: editedTask,
    erwartungshorizont_ki_prompt: editedSolution,
    is_master: false,
    master_id: masterId,  // ← Linking zum Master
    export_to_moodle: true,
  })
  ```

---

## 5. Integration: All-in-One Hook

### `useReplicatorIntegration` Hook

```javascript
const {
  masterModalOpen,
  setMasterModalOpen,
  replicaModalOpen,
  setReplicaModalOpen,
  startReplication,  // (masterId) → Öffnet Modal + startet Generierung
  isGenerating,
} = useMasterReplicator({
  lernpaketId,
  lernzielId,
  contextData,
});
```

### Workflow-Komponente

```jsx
<MasterReplicatorWorkflow
  masterAufgabe={aufgabe}
  lernpaketId={paketId}
  lernzielId={zielId}
  activityType="free_text"
  onMasterCreated={() => refetch()}
  onReplicaSaved={() => refetch()}
/>
```

**Rendering:**
- Kein Master → Zeige "Masteraufgabe erstellen" Button
- Master existiert → Zeige "✨ Replikate erstellen" Button

---

## 6. Implementierungs-Checklist

- ✅ Datenbank-Schema: `is_master`, `master_id`, `export_to_moodle`, `activity_type`, `activity_config`
- ✅ `MasterTaskModal.jsx` mit dynamischer Activity-Komponenten-Rendering
- ✅ `MatchTermsPlaceholder.jsx` & `FreeTextPlaceholder.jsx` Beispiele
- ✅ `generateReplicasSecure.js` Backend-Funktion mit LLM-Prompt
- ✅ `ReplicaReviewModal.jsx` mit Einzelspeicherung & Editing
- ✅ `secureApi.generateReplicas()` API-Wrapper
- ✅ `ReplicatorIntegration.jsx` Hook & Buttons

---

## 7. Verwendungsbeispiel (Vollständig)

```jsx
import { MasterReplicatorWorkflow } from '@/components/aufgaben/ReplicatorIntegration';
import { useQuery } from '@tanstack/react-query';

function UebungsPhaseView({ lernpaketId }) {
  const { data: masterAufgabe, refetch } = useQuery(
    ['master_aufgabe', lernpaketId],
    () => base44.entities.Aufgabenbausteine.filter({
      lernpaket_id: lernpaketId,
      is_master: true,
    })
  );

  return (
    <div className="space-y-4">
      <h2>Übungsphase</h2>

      {/* Workflow für Master/Replikator */}
      <MasterReplicatorWorkflow
        masterAufgabe={masterAufgabe?.[0]}
        lernpaketId={lernpaketId}
        lernzielId="ziel-123"
        activityType="free_text"
        contextData={{ fach: 'Deutsch', jahrgangsstufe: '10' }}
        onMasterCreated={() => refetch()}
        onReplicaSaved={() => refetch()}
      />

      {/* Übrige UI */}
    </div>
  );
}
```

---

## 8. Workflow-Skizze

```
┌─────────────────────────────────────────────────────────┐
│ User klickt "Masteraufgabe erstellen"                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ MasterTaskModal      │
          │ (Activity-Type Modal) │
          └─────────┬────────────┘
                    │
                    ▼ (Speichern)
          ┌──────────────────────┐
          │ is_master: true      │
          │ (DB gespeichert)     │
          └─────────┬────────────┘
                    │
                    ▼
     ┌──────────────────────────────────┐
     │ User klickt "Replikate erstellen" │
     └──────────────┬───────────────────┘
                    │
                    ▼ (API Call)
          ┌──────────────────────┐
          │ generateReplicasSecure│
          │ (LLM Prompt)         │
          └─────────┬────────────┘
                    │
                    ▼
          ┌──────────────────────┐
          │ ReplicaReviewModal   │
          │ (Loading Skeleton)   │
          └─────────┬────────────┘
                    │
          ▼ (LLM Response)
    ┌────────────────────────────┐
    │ 10 Replikate mit Edit       │
    │ Pro Replikat:               │
    │  ✏️ Bearbeiten              │
    │  💾 Diese Aufgabe speichern │
    └────────┬───────────────────┘
             │
          ▼ (Speichern)
    ┌────────────────────────────┐
    │ is_master: false           │
    │ master_id: <master.id>     │
    │ (DB gespeichert)           │
    └────────────────────────────┘
```

---

✅ **Phase 6.7: Master → Replicator Workflow complete**
- Single-Table Design mit Masteraufgaben-Verlinkung
- Dynamische Activity-basierte Modals
- LLM-gestützte Replikation mit Kontext
- Human-in-the-Loop Review & Einzelspeicherung