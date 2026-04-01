# Phase 6.5: Paginierung & Refactoring

## Architektur-Überblick

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend: React                           │
├─────────────────────────────────────────────────────────────┤
│ EinheitenOverview.jsx                                        │
│  └─ useState: page = 1                                       │
│  └─ useEinheitenList(page, 15)                               │
│      └─ useQuery(['einheiten', 'list', page, 15])            │
│          └─ secureApi.getEinheitenList(page, 15)             │
│              └─ base44.functions.invoke(...)                 │
│                                                              │
│  UI: [< Prev] [Page 1/5] [Next >]  ← Pagination Controls    │
│      └─ disabled={isPlaceholderData || !hasMore}             │
└─────────────────────────────────────────────────────────────┘
           ↓ HTTP POST (page, limit)
┌─────────────────────────────────────────────────────────────┐
│              Backend: Deno Function                          │
├─────────────────────────────────────────────────────────────┤
│ getEinheitenListSecure.js                                    │
│  1. Auth + RBAC                                              │
│  2. Filter nach Rolle (Admin/Fachschaft/Fachlehrkraft)       │
│  3. Zähle Total (für Pagination Meta)                        │
│  4. Slice Page (offset, limit)                               │
│  5. Map Selective Fields (nur Liste-Felder)                  │
│  6. Return: { data: [...], meta: {...} }                     │
└─────────────────────────────────────────────────────────────┘
           ↓ JSON Response
┌─────────────────────────────────────────────────────────────┐
│             Frontend: React Query Cache                      │
├─────────────────────────────────────────────────────────────┤
│ queryKey: ['einheiten', 'list', page=1, limit=15]            │
│ data: {                                                      │
│   data: [...],                                               │
│   meta: {                                                    │
│     total_count: 47,                                         │
│     current_page: 1,                                         │
│     total_pages: 4,                                          │
│     page_size: 15                                            │
│   }                                                          │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Backend-Funktion: `getEinheitenListSecure.js`

### Parameter
```javascript
{
  page: 1,    // Seitennummer (Minimum 1)
  limit: 15   // Einträge pro Seite (1-100)
}
```

### Response-Format
```javascript
{
  success: true,
  data: [
    {
      id: "einheit-123",
      fach: "Mathematik",
      titel_der_einheit: "Grundrechenarten",
      jahrgangsstufe: "5",
      freigabe_status: "In Planung",
      sync_status: "new",
      last_synced_at: null,
      last_exported_at: null,
      created_date: "2026-04-01T...",
      updated_date: "2026-04-01T...",
      version: 1
    },
    // ... 15 Einträge
  ],
  meta: {
    total_count: 47,      // Gesamt Einheiten (für User)
    current_page: 1,      // Aktuelle Seite
    total_pages: 4,       // 47 / 15 = 4 Seiten
    page_size: 15         // Einträge pro Seite
  }
}
```

### RBAC-Logik
```
Administrator       → Sieht ALLE Einheiten
Fachschaftsleitung  → Sieht nur eigene Fächer
Fachlehrkraft       → Sieht nur Einheiten, zu denen er Mitglied ist
Betrachter          → Sieht nur Einheiten, zu denen er Mitglied ist
```

---

## 2. Frontend API: `secureApi.js`

```javascript
export async function getEinheitenList(page = 1, limit = 15) {
  const response = await base44.functions.invoke('getEinheitenListSecure', {
    page,
    limit,
  });
  return response.data;
}

export const secureApi = {
  // ...
  getEinheitenList,
};
```

---

## 3. React Query Hook: `useEinheitenList.js`

```javascript
export function useEinheitenList(page = 1, limit = 15, options = {}) {
  const { data, isPending, error, isPlaceholderData, isFetching } = useQuery({
    queryKey: ['einheiten', 'list', page, limit],
    queryFn: () => secureApi.getEinheitenList(page, limit),
    placeholderData: (previousData) => previousData, // ← keepPreviousData Pattern!
    staleTime: 5 * 60 * 1000,  // 5 min
    gcTime: 10 * 60 * 1000,    // 10 min
  });

  return {
    einheiten: data?.data || [],
    meta: data?.meta || { total_count: 0, current_page: page, total_pages: 0 },
    isPending,
    isPlaceholderData,
    isFetching,
    error,
  };
}
```

### keepPreviousData Pattern

**Was es macht**:
- Benutzer klickt "Nächste Seite"
- React Query lädt neue Seite im Background
- **ALT** (ohne `keepPreviousData`): Leerer Screen während Loading
- **NEU** (mit `keepPreviousData`): Alte Seite bleibt sichtbar, neue Daten laden im Background

```javascript
// ALTES PATTERN (❌ Blinken/Flackern)
queryFn: () => secureApi.getEinheitenList(page, limit),
// → data ist `undefined` während Loading → Screen leer

// NEUES PATTERN (✅ Nahtlos)
placeholderData: (previousData) => previousData,
// → data bleibt alte Seite während Loading
// → isPlaceholderData = true zeigt an: "Das sind alte Daten, neue laden"
```

---

## 4. Frontend Komponente: Pagination UI

```jsx
// EinheitenOverview.jsx

import { useState } from 'react';
import { useEinheitenList } from '@/hooks/useEinheitenList';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function EinheitenOverview() {
  const [page, setPage] = useState(1);
  const limit = 15;

  // Hook: Single Query statt 5-8!
  const { einheiten, meta, isPending, isPlaceholderData, isFetching } =
    useEinheitenList(page, limit);

  const hasMorePages = page < meta.total_pages;
  const hasPreviousPages = page > 1;

  // Buttons disabled während Placeholder-Daten oder Loading
  const isLoadingNewPage = isPlaceholderData || isFetching;

  return (
    <div className="space-y-6">
      {/* Hauptinhalt */}
      <div className={`space-y-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
        {einheiten.map((einheit) => (
          <EinheitCard key={einheit.id} einheit={einheit} />
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Seite {meta.current_page} von {meta.total_pages}
          {isLoadingNewPage && (
            <span className="ml-2 inline-flex gap-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              Lädt...
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPreviousPages || isLoadingNewPage}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMorePages || isLoadingNewPage}
            className="gap-2"
          >
            Weiter
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info für Placeholder State */}
      {isPlaceholderData && (
        <p className="text-xs text-amber-600 text-center">
          Neue Daten werden geladen...
        </p>
      )}

      {/* Error Handling */}
      {!isPending && einheiten.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Keine Einheiten gefunden.
        </div>
      )}
    </div>
  );
}
```

---

## 5. Alte Komponenten: Refactoring-Beispiel

### VORHER (❌ Alle Daten auf einmal)

```jsx
function EinheitenOverview() {
  // PROBLEM: 5-8 separate Queries laden ALLES
  const { data: einheiten } = useQuery(['einheiten']);
  const { data: themenfelder } = useQuery(['themenfelder']);
  const { data: lernpakete } = useQuery(['lernpakete']);
  // ...

  // Keine Pagination!
  return (
    <div>
      {einheiten?.map(e => <EinheitCard key={e.id} einheit={e} />)}
    </div>
  );
}
```

### NACHHER (✅ Paginiert & optimiert)

```jsx
function EinheitenOverview() {
  const [page, setPage] = useState(1);

  // SOLUTION: 1 Query mit Pagination
  const { einheiten, meta, isPlaceholderData } = useEinheitenList(page, 15);

  return (
    <div className="space-y-6">
      {einheiten.map(e => <EinheitCard key={e.id} einheit={e} />)}

      {/* Pagination Controls */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isPlaceholderData}
        >
          ← Zurück
        </button>
        <span>Seite {meta.current_page} / {meta.total_pages}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page >= meta.total_pages || isPlaceholderData}
        >
          Weiter →
        </button>
      </div>
    </div>
  );
}
```

---

## 6. Workspace-Detail: N+1 Problem gelöst

### VORHER (❌ Viele Queries)

```jsx
function WorkspaceDetail({ einheitId }) {
  const { data: einheit } = useQuery(['einheiten', einheitId]);
  const { data: themenfelder } = useQuery(['themenfelder']);
  const { data: lernpakete } = useQuery(['lernpakete']);
  const { data: lernziele } = useQuery(['lernziele']);
  const { data: aufgaben } = useQuery(['aufgaben']);

  // Client-Side Filtering!
  const themenfeldFuerEinheit = themenfelder?.filter(tf => tf.einheit_id === einheitId);
  const paketeFuerThemenfeld = lernpakete?.filter(p => p.themenfeld_id === tf.id);
  // ...
}
```

### NACHHER (✅ Single Aggregation)

```jsx
function WorkspaceDetail({ einheitId }) {
  // 1 Query! Backend liefert hierarchische Struktur
  const { data } = useWorkspaceData(einheitId);

  // Keine Filter-Logik mehr, direkt hierarchisch
  return (
    <div>
      {data?.themenfelder.map(tf => (
        <div key={tf.id}>
          {tf.lernpakete.map(paket => (
            <div key={paket.id}>
              {paket.lernziele.map(ziel => (
                <div key={ziel.id}>
                  {ziel.aufgaben.map(aufgabe => (
                    <AufgabeItem key={aufgabe.id} aufgabe={aufgabe} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Performance-Verbesserungen

### Datenreduktion

```
VORHER:
- /api/einheiten → 200 Einheiten (alle Felder) = ~150 KB
- /api/themenfelder → 500 Themenfelder = ~80 KB
- /api/lernpakete → 2000 Pakete = ~300 KB
- /api/lernziele → 5000 Ziele = ~400 KB
- /api/aufgaben → 10000 Aufgaben = ~800 KB
TOTAL: ~1.73 MB ❌

NACHHER:
- /api/einheiten?page=1&limit=15 → 15 Einheiten = ~12 KB
- /api/workspace/{id} → Hierarchie für 1 Einheit = ~80 KB
TOTAL: ~92 KB ✅
→ 95% weniger Datentraffic!
```

### Query-Reduktion

```
VORHER: 5-8 Queries × Anzahl Komponenten = N+1 Problem
NACHHER: 1 Query für Liste, 1 Query für Detail = Linear
```

---

## 8. Testing

### Test: Pagination Button State

```javascript
it('disables next button on last page', () => {
  render(
    <EinheitenOverview />
  );
  
  // Mock: total_pages = 1, current_page = 1
  expect(screen.getByText('Weiter →')).toBeDisabled();
});

it('shows placeholder data while loading new page', async () => {
  const { rerender } = render(<EinheitenOverview />);
  
  // Page 1 loaded
  expect(screen.getByText('Einheit 1')).toBeInTheDocument();
  
  // Click next → new page loading
  fireEvent.click(screen.getByText('Weiter →'));
  
  // Old data still visible (isPlaceholderData = true)
  expect(screen.getByText('Einheit 1')).toBeInTheDocument();
  expect(screen.getByText('Lädt...')).toBeInTheDocument();
});
```

---

## 9. Sicherheit & Audit (Punkt 7)

✅ **Performance ohne Sicherheitsverluste**:
- RBAC-Check im Backend: Jede Seite wird gefiltert nach User-Rolle
- Kein Dataleak: Benutzer sieht nur Einheiten, zu denen er Zugriff hat
- Selective Fetching: Nur benötigte Felder (keine sensiblen Daten)

---

## Zusammenfassung

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| **Queries** | 5-8 pro View | 1-2 pro View |
| **Datentransfer** | ~1.73 MB | ~92 KB |
| **N+1 Problem** | Ja ❌ | Nein ✅ |
| **Pagination** | Keine | Vollständig ✅ |
| **Client-Filtering** | Viel | Keine ✅ |
| **Rendering** | Mit Flackern | Nahtlos ✅ |