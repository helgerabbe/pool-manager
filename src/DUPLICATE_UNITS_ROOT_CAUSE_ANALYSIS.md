# Duplicate Units & Tab 1 Bearbeitungsmodus – Root Cause Analysis

## 🔴 Problem 1: Duplicate Units entstehen

**Symptom:**
- Svenja erstellt Unit → erscheint 3x in der DB
- 2 leere Copies, 1 mit 16 Inhalten

**Hypothese: Race Condition bei Unit-Erstellung**

### Mögliche Ursachen:

1. **Double-Submit (Browser)**: Button wird schnell doppelt geklickt
   - Keine Debounce-Protection
   - Keine optimistic locking im Frontend

2. **Double-Mutation (React Query)**: useEffect triggert Mutation zweimal
   - Abhängigkeiten-Array falsch konfiguriert?
   - Modal wird mehrfach gerendert?

3. **Backend Race Condition**: Mehrere Requests gleichzeitig
   - Keine `unique constraint` auf `(titel, fach, jahrgangsstufe)`
   - `createEinheitSecure` prüft nicht auf Duplicates vor Create

### Fixes:

**Frontend:**
```jsx
// In SchnellErstellenModal (pages/EinheitenListe)
const [submitting, setSubmitting] = useState(false);

const createMutation = useMutation({
  mutationFn: async (data) => {
    setSubmitting(true);
    return base44.entities.Einheiten.create(data);
  },
  onSuccess: (einheit) => {
    setSubmitting(false);
    // ...
  },
  onError: () => {
    setSubmitting(false);
  }
});

// Button: disabled={submitting || createMutation.isPending}
```

**Backend (Optional, aber sauberer):**
```javascript
// In createEinheitSecure.js
const existingUnits = await base44.asServiceRole.entities.Einheiten.filter({
  titel_der_einheit: data.titel_der_einheit,
  fach: data.fach,
  jahrgangsstufe: data.jahrgangsstufe,
  created_by: user.email,
});

if (existingUnits.length > 0) {
  return Response.json(
    { error: 'Unit mit diesem Namen und Fach existiert bereits' },
    { status: 409 }
  );
}
```

---

## 🟠 Problem 2: Bearbeitungsmodus Tab 1 nicht sauber implementiert

**Aktueller Code (pages/Workspace, Zeilen 434-473):**

```jsx
{activeTab === 'struktur' && (permissions.kannStrukturBearbeiten(einheit?.fach) || unitAccess.hasFullAccess) && (
  <div className="flex items-center gap-2 shrink-0">
    {/* Status-Badge */}
    {isStructuralEditingActive ? (
      <span>✏️ Bearbeitungsmodus</span>
    ) : (
      <span>🔒 Lesemodus</span>
    )}
    
    {/* Action-Button */}
    {isStructuralEditingActive ? (
      <button onClick={handleReleaseStructLock}>Bearbeitung beenden</button>
    ) : (
      <button onClick={handleAcquireStructLock}>Strukturbearbeitung starten</button>
    )}
  </div>
)}
```

### ❌ Probleme:

1. **Nur im "struktur"-Tab sichtbar**: Lock-Button ist nur im Tab 2 sichtbar
   - User wechselt zu Tab 1 → kein Hinweis, dass Lock aktiv ist
   - Lock wird automatisch freigegeben (Code Zeile 147-150)
   - **Aber der User sieht nicht, dass sein Lock weg ist!**

2. **Kein Feedback beim Tab-Wechsel**: 
   - User ist im "struktur"-Tab im Bearbeitungsmodus
   - Klickt auf "Tab 1 – Einheit verwalten"
   - Lock wird freigegeben (Line 147-150)
   - Keine Toast/Warnung → User ist verwirrt

3. **Keine globale Edit-Status Anzeige**:
   - Der Lock-Status sollte oben im Header IMMER sichtbar sein
   - Nicht nur im "struktur"-Tab

4. **Lock-Release beim Tab-Wechsel ist automatisch, aber nicht explizit**:
   - Code sagt: "wenn activeTab !== 'struktur' → release lock"
   - Aber User hat nie "Bearbeitung beenden" geklickt
   - User weiß nicht, dass sein Lock weg ist

### ✅ Lösungsansatz:

**Option 1: Persistenter Lock-Status-Banner (Empfohlen)**
```jsx
{/* ÜBER ALLEN TABS – immer sichtbar */}
{isStructuralEditingActive && (
  <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
    <PenLine className="w-4 h-4 text-blue-600 animate-pulse" />
    <span className="text-sm font-semibold text-blue-900 flex-1">
      ✏️ Du befindest dich im Bearbeitungsmodus des Struktur-Tabs. Nur du kannst Änderungen vornehmen.
    </span>
    <button 
      onClick={handleReleaseStructLock}
      className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
    >
      Bearbeitung beenden
    </button>
  </div>
)}
```

**Option 2: Warning Modal beim Tab-Wechsel**
```jsx
// Vor Tab-Wechsel prüfen:
if (isStructuralEditingActive && nextTab !== 'struktur') {
  // Modal: "Möchtest du den Bearbeitungsmodus beenden?"
  // Optionen: "Ja, beenden" oder "Abbrechen (im struktur-Tab bleiben)"
}
```

**Option 3: Lock-Status für ALLE Tabs – nicht nur "struktur"**
```jsx
{/* Sichtbar in JEDEM Tab, nicht nur struktur */}
{activeTab !== null && (permissions.kannStrukturBearbeiten(...) || unitAccess.hasFullAccess) && (
  // Zeige Lock-Status & Button immer an
)}
```

### 🎯 Empfehlung:

**Kombination aus Option 1 + 3:**
1. **Persistenter Banner** (Option 1) oberhalb aller Tabs
2. **Lock-Button immer sichtbar** (Option 3), nicht nur im struktur-Tab
3. **Auto-Release mit Toast-Benachrichtigung**: "✅ Bearbeitungsmodus beendet"

---

## Zusammenfassung:

| Problem | Ursache | Fix |
|---------|---------|-----|
| Duplicates | Race Condition (Button-Click / Mutation-Trigger) | Debounce-Button + Backend-Duplicate-Check |
| Tab-1-Modus nicht sauber | Lock-Status nur im Tab-2 sichtbar, Auto-Release ohne Feedback | Persistenter Banner + immer sichtbarer Lock-Button + Toast bei Auto-Release |