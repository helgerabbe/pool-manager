# Phase 6.7: UX & Interface Polish

## 📋 Übersicht

Phase 6.7 fokussiert auf **Ladezustände**, **leere Listen** und **Tablet-Optimierung** unter Verwendung der bestehenden shadcn/ui + Tailwind CSS Design-Token-Architektur.

---

## 1. EmptyState Komponente

**Datei**: `src/components/ui/empty-state.jsx`

### Struktur
```jsx
<EmptyState
  icon={FileText}           // Lucide Icon
  title="Keine Einheiten"
  description="Erstellen Sie eine neue Einheit, um zu beginnen."
  action={<Button onClick={...}>Neue Einheit</Button>}
/>
```

### Design Tokens
- **Border**: `border-border` (CSS-Var `--border`)
- **Background**: `bg-card` (CSS-Var `--card`)
- **Text Primary**: `text-foreground`
- **Text Secondary**: `text-muted-foreground`
- **Icons**: `h-12 w-12 text-muted-foreground`

### Beispiel im Code
```jsx
import EmptyState from '@/components/ui/empty-state';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

<EmptyState
  icon={FileText}
  title="Keine Einheiten vorhanden"
  description="Starten Sie, indem Sie eine neue Einheit erstellen."
  action={<Button><Plus className="w-4 h-4 mr-2" /> Neue Einheit</Button>}
  className="mt-8"
/>
```

---

## 2. Skeleton-Komponenten

### EinheitenListSkeleton (Struktur-Skeleton)

**Datei**: `src/components/loading/EinheitenListSkeleton.jsx`

Imitiert das finale Layout einer Einheiten-Karte:
```
┌─ Fach Badge     ┬─ Status Badge ─┐
│ Titel           │                 │
│ Fach | Jahrgang ├─────────────────┘
│ Beschreibung... |
├─ Avatars   ─ Action Button ──┐
```

### Tailwind Design Tokens
```jsx
// Skeleton-Reihe
<div className="h-6 w-3/4 rounded bg-muted animate-pulse" />

// Key Classes
- bg-muted           // Grauer Hintergrund (CSS-Var --muted)
- animate-pulse      // Blinkeffekt
- rounded-md         // Border-Radius (var --radius)
- border-border      // Border-Farbe (CSS-Var --border)
```

### Verwendung
```jsx
import EinheitenListSkeleton from '@/components/loading/EinheitenListSkeleton';

{isLoading ? (
  <EinheitenListSkeleton count={5} />
) : (
  <EinheitenList data={einheiten} />
)}
```

---

## 3. Tablet & Touch-Optimierung

### 3.1 Drag & Drop Touch-Targets

Mindestens **44x44px** für Touch-Elemente:

```jsx
// ❌ Zu klein
<button className="p-2">Drag</button>

// ✅ Korrekt
<button className="p-3">Drag</button>  // 44px (p-3 = 12px * 4 = 48px)
```

### 3.2 Native Scroll Deaktivierung

```jsx
// Auf draggable Elementen setzen
<div
  draggable
  className="touch-none cursor-grab active:cursor-grabbing"
>
  Ziehen Sie mich
</div>
```

### 3.3 Tabellen-Responsivität

```jsx
// Wrapper mit horizontaler Scroll
<div className="overflow-x-auto border border-border rounded-lg">
  <table className="w-full">
    <thead>
      <tr>
        <th className="px-4 py-3 text-left">Einheit</th>
        <th className="px-4 py-3 text-left">Fach</th>
        <th className="px-4 py-3 text-left">Status</th>
      </tr>
    </thead>
    <tbody>
      {/* Rows */}
    </tbody>
  </table>
</div>
```

### 3.4 Responsive Padding für Tablet

```jsx
// Weniger Padding auf Mobile, mehr auf Desktop
<div className="p-3 sm:p-4 md:p-6">
  Inhalt
</div>
```

---

## 4. Integration mit bestehenden Komponenten

### EinheitenListe mit Loading State
```jsx
import EinheitenListSkeleton from '@/components/loading/EinheitenListSkeleton';
import EmptyState from '@/components/ui/empty-state';
import { Plus, Inbox } from 'lucide-react';

export default function EinheitenListe() {
  const { data: einheiten, isLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => secureApi.getEinheitenList(1, 15),
  });

  if (isLoading) {
    return <EinheitenListSkeleton count={5} />;
  }

  if (!einheiten || einheiten.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Keine Einheiten vorhanden"
        description="Erstellen Sie eine neue Einheit, um zu beginnen."
        action={<Button onClick={...}><Plus className="w-4 h-4" /> Neue Einheit</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {einheiten.map(einheit => (
        <EinheitCard key={einheit.id} einheit={einheit} />
      ))}
    </div>
  );
}
```

---

## 5. Design-Token Referenz

| Token | CSS-Variable | Tailwind Klasse | Verwendung |
|-------|--------------|-----------------|-----------|
| Primary | `--primary` | `bg-primary`, `text-primary` | Hauptfarbe, CTA-Buttons |
| Muted | `--muted` | `bg-muted`, `text-muted-foreground` | Skeletons, Disabled State |
| Border | `--border` | `border-border` | Divider, Card Borders |
| Card | `--card` | `bg-card`, `text-card-foreground` | Container, Dialog Backgrounds |
| Foreground | `--foreground` | `text-foreground` | Haupttext |
| Muted FG | `--muted-foreground` | `text-muted-foreground` | Sekundärtext, Placeholder |

---

## 6. Checklist Phase 6.7

- ✅ `EmptyState.jsx` mit Props (icon, title, description, action)
- ✅ `EinheitenListSkeleton.jsx` mit strukturalen Platzhaltern
- ✅ Alle Farben aus Design Tokens (keine Hardcoded-Farben)
- ✅ Tablet Touch-Targets ≥ 44x44px
- ✅ `touch-none` auf draggable Elementen
- ✅ `overflow-x-auto` für breite Tabellen
- ✅ Responsive Padding (p-3 → p-6)
- ⏳ Integration in bestehende Pages (Dashboard, EinheitenListe, etc.)

---

✅ Phase 6.7 ready: Skeletons, Empty States, Tablet-Polish mit Design Tokens.