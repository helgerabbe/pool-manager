# Phase 5: UI/UX Fehlertoleranz & Loading States

## Implementierte Features

### 1. React Error Boundaries

**Component: `ErrorBoundary`** (`components/errors/ErrorBoundary.jsx`)

Eine wiederverwendbare Error Boundary, die React-Fehler in Child-Komponenten abfängt und verhindert, dass die gesamte App abstürzt.

**Features:**
- ✅ Zeigt benutzerfreundliche Fallback-UI mit Icon und Meldung
- ✅ "Bereich neu laden"-Button zum lokalen Reset ohne ganzseitig reload
- ✅ Debug-Informationen im Development-Mode
- ✅ Hält Navigation und andere Bereiche funktionsfähig

**Verwendung:**

```jsx
import ErrorBoundary from '@/components/errors/ErrorBoundary';

// Einfach Komponenten umschließen:
<ErrorBoundary label="Dein Bereich-Name">
  <CriticalComponent />
</ErrorBoundary>
```

**Fallback-UI:**
```
⚠️ Fehler in [Dein Bereich-Name]

Es ist ein unerwarteter Fehler aufgetreten.
Bitte versuchen Sie, den Bereich neu zu laden.

[🔄 Bereich neu laden]

Die übrige App funktioniert weiterhin normal...
```

**Integriert in Workspace:**
- Äußerstes `<ErrorBoundary label="Workspace">` umschließt gesamte Seite
- Innere Boundaries für `Basis-Struktur`, `Detail-Panel`, `Allgemeine Aufgaben`, `Projektaufgaben`
- Jede Säule/Tab kann separat fehlschlagen ohne andere zu beeinflussen

---

### 2. Gehärtete Buttons mit Loading States

**Component: `LoadingButton`** (`components/buttons/LoadingButton.jsx`)

Ein Button-Wrapper, der automatisch während API-Calls deaktiviert wird.

**Features:**
- ✅ `disabled={true}` während `isLoading`
- ✅ Zeigt Spinner-Icon und ändert Text
- ✅ Verhindert Doppelklicks/mehrfache API-Calls
- ✅ Transparenz-Feedback (`opacity-75`)

**Verwendung:**

```jsx
import LoadingButton from '@/components/buttons/LoadingButton';

const MyComponent = () => {
  const mutation = useMutation({ ... });
  
  return (
    <LoadingButton
      isLoading={mutation.isPending}
      onClick={() => mutation.mutate(data)}
      loadingText="Speichert..."
    >
      Speichern
    </LoadingButton>
  );
};
```

**Rendering-Verhalten:**

```
// Idle:
[💾 Speichern]

// Loading:
[⚙️ Speichert...]  (disabled, kein Klick möglich)
```

**Properties:**
- `isLoading` (bool) – Aktiviert Loading-State
- `disabled` (bool) – Standard Button-disabled
- `loadingText` – Custom Text während Load (default: "Wird gespeichert...")
- `loadingIcon` – Icon anzeigen? (default: true)
- `variant`, `size`, etc. – wie normale Button-Props

---

### 3. Skeleton Loader für Initial Loading

**Components: `SkeletonLoader`** (`components/loading/SkeletonLoader.jsx`)

Wiederverwendbare Skeletons für verschiedene Layouts, um Layout-Shifts während des initialen Ladens zu vermeiden.

**Verfügbare Komponenten:**

```jsx
import {
  SkeletonLoader,      // Generischer Skeleton
  SkeletonTableRow,    // Tabellenzeile
  SkeletonCard,        // Card-Layout
  SkeletonWorkspace,   // Komplexes Workspace-Layout
} from '@/components/loading/SkeletonLoader';
```

**Beispiel – Workspace Initial Loading:**

```jsx
const { data, isLoading } = useQuery({
  queryKey: ['einheiten'],
  queryFn: () => base44.entities.Einheiten.list()
});

if (isLoading) {
  return <SkeletonWorkspace />;
}

return <YourContent data={data} />;
```

**Ausgabe:**
```
┌─ Linkes Panel ──┐  ┌──────── Mitte + Rechts Panel ────────┐
│ ▓▓▓▓▓▓ (Title) │  │ ▓▓▓▓▓▓ (Header)                       │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└────────────────┘  └────────────────────────────────────────┘
```

---

### 4. Responsive Fallback-Layout

**Tablet-Freundliche Anpassungen:**

#### AufgabeKompetenzMapping (Drag-and-Drop Mapping)

**VORHER (nur Desktop):**
```jsx
<div className="grid grid-cols-2 gap-6">
  {/* Linke Seite: 50% */}
  {/* Rechte Seite: 50% */}
</div>
```

**NACHHER (Responsive):**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Mobile: 100% (stapelt sich vertikal) */}
  {/* Tablet+ (md): 2 Spalten mit 50% */}
</div>
```

**Breakpoints (Tailwind):**
- `sm`: 640px (kleine Tablets)
- `md`: 768px (iPad)
- `lg`: 1024px (große Tablets / Desktop)
- `xl`: 1280px (Desktop)

**Best Practice:**
- Für Split-Screen / Drag-and-Drop: `grid-cols-1 md:grid-cols-2`
- Für Sidebars: `w-full md:w-96 lg:w-[400px]`
- Für Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

---

## Implementierungs-Checkliste

- [x] ErrorBoundary-Komponente erstellt
- [x] ErrorBoundary in Workspace integriert (äußen + innere Boundaries)
- [x] LoadingButton für API-Calls erstellt
- [x] SkeletonLoader für verschiedene Layouts erstellt
- [x] Workspace Initial Loading auf Skeleton umgestellt
- [x] AufgabeKompetenzMapping responsive gemacht (grid-cols-1 md:grid-cols-2)
- [x] Dokumentation und Code-Snippets bereitgestellt

---

## Migration bestehender Code

### Fehlerhafte Komponenten schützen:

```javascript
// ❌ VORHER:
<YourComponent />

// ✅ NACHHER:
<ErrorBoundary label="Deine Komponente">
  <YourComponent />
</ErrorBoundary>
```

### Buttons mit Loading States upgraden:

```javascript
// ❌ VORHER:
<Button onClick={handleSave} disabled={false}>
  Speichern
</Button>

// ✅ NACHHER:
<LoadingButton
  isLoading={mutation.isPending}
  onClick={() => mutation.mutate(data)}
>
  Speichern
</LoadingButton>
```

### Initial Loading States:

```javascript
// ❌ VORHER:
const { data, isLoading } = useQuery(...);
if (isLoading) return <Spinner />;
return <Content />;

// ✅ NACHHER:
const { data, isLoading } = useQuery(...);
if (isLoading) return <SkeletonCard />; // oder <SkeletonWorkspace />
return <Content />;
```

---

## Testing-Szenarien

### Szenario 1: Komponenten-Fehler
```
1. Öffne eine kritische Komponente (z.B. Workspace)
2. Werfe absichtlich einen Error (console.error während render)
3. Erwartung: ErrorBoundary fängt auf, zeigt Fallback-UI
4. User klickt "Bereich neu laden" → Reset & Normal
```

### Szenario 2: Doppelklick auf Save-Button
```
1. Save-Button mit LoadingButton
2. Klick 1x → mutation.isPending = true
3. Button wird disabled, Text → "Speichert..."
4. Klick 2x → Hat keinen Effekt (disabled)
5. API-Response → pending = false → Button enabled wieder
```

### Szenario 3: Tablet Drag-and-Drop
```
1. Öffne AufgabeKompetenzMapping auf iPad (768px)
2. Erwartung: Grid bricht um zu grid-cols-1 (vertikal gestapelt)
3. Links: Verfügbare Lernziele (100% Breite)
4. Rechts: Dropzone (100% Breite darunter)
5. Drag & Drop funktioniert vertikal genauso
```

---

## Performance & Best Practices

✅ **Error Boundaries**
- Platziere mehrere Boundaries, nicht nur eine global
- Jeder kritische Bereich = eigene Boundary
- Fängt auch Fehler in Event-Handlerd ab (nicht nur Render)

✅ **Loading States**
- Immer `mutation.isPending` für Buttons verwenden
- Skeleton-Loader MUSS die gleiche Höhe/Breite haben wie Content
- Verhindert CLS (Cumulative Layout Shift)

✅ **Responsive**
- Mobile-first: `grid-cols-1` zuerst, dann `md:grid-cols-2`
- Teste auf realen Geräten, nicht nur Browser-DevTools
- Touchziele (Buttons, Links) ≥ 44x44px

---

## Weitere Verbesserungen (Backlog)

- [ ] Globale Error-Fallback für ungefangene Fehler
- [ ] Error-Logging an Sentry/LogRocket
- [ ] Retry-Logik für fehlgeschlagene API-Calls
- [ ] Optimistic Updates für schnellere UX
- [ ] Offline-Mode mit Service Worker