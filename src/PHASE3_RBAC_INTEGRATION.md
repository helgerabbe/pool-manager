# Phase 3: RBAC-Härtung & Concurrency-Protection

## Implementierte Features

### 1. API-Level Mutation Protection

**Datei:** `hooks/useProtectedMutation.js`

Alle speichernden API-Calls müssen durch `useProtectedMutation` geleitet werden:

```jsx
const mutation = useProtectedMutation(
  {
    mutationFn: (data) => base44.entities.Einheiten.create(data),
    permissionCheck: () => permissions.kannEinheitVerwalten,
    denialMessage: 'Keine Berechtigung zum Erstellen von Einheiten',
  },
  {
    onSuccess: () => queryClient.invalidateQueries(...),
  }
);
```

**Spezielle Hooks:**
- `useProtectedEinheitMutation()` – Für Einheiten-CRUD
- `useProtectedBasismodulMutation()` – Mit Fachschafts-Isolation
- `useProtectedAufgabenbaustein()` – Für Task-Module

### 2. Fachschafts-Isolation für Basismodule

**Dateien:**
- `lib/rbac.js` – Erweiterte `kannEinheitBearbeiten(role, faecher, fach)`
- `hooks/useProtectedBasismodulMutation()` – Prüft `basismodul.fach`

Ein Nutzer darf ein Basismodul nur bearbeiten, wenn:
- Er ADMIN ist, ODER
- Er Fachschaftsleitung/Lehrkraft mit Zuständigkeit für `basismodul.fach`

### 3. Structural Lock Härtung

**Datei:** `lib/structuralLockEnhanced.js`

Wenn User A eine Einheit strukturell bearbeitet (Lock aktiv):
- **User B:** Alle strukturellen Buttons werden **disabled**
- **Disabled Actions:** CREATE/DELETE_THEMENFELD, CREATE/DELETE/MOVE_LERNPAKET, etc.
- **UI-Feedback:** StructuralLockWarning zeigt Lock-Inhaber und verbl. Zeit

**Verwendung in Components:**

```jsx
import StructuralLockWarning from '@/components/workspace/StructuralLockWarning';
import { StructuralActionButton } from '@/components/workspace/StructuralActionButtons';

// Banner anzeigen
<StructuralLockWarning einheit={einheit} currentUserEmail={user.email} />

// Button mit Auto-Disable
<StructuralActionButton
  einheit={einheit}
  currentUserEmail={user.email}
  action="DELETE_THEMENFELD"
  onClick={deleteThemenfeld}
>
  Themenfeld löschen
</StructuralActionButton>
```

### 4. Route-Guards

**Dateien:**
- `lib/routeGuards.js` – Logik-Funktionen
- `components/auth/RouteGuard.jsx` – React-Components

**Guards für spezifische Routes:**

```jsx
// In App.jsx
import { EinheitRouteGuard, BasismodulRouteGuard } from '@/components/auth/RouteGuard';

<Route element={<AppLayout />}>
  {/* Einheiten-Routen */}
  <Route 
    path="/einheiten/:id" 
    element={
      <EinheitRouteGuard requiredFach="Deutsch" requireEdit={true}>
        <EinheitDetailPage />
      </EinheitRouteGuard>
    } 
  />
  
  {/* Basismodule-Routen */}
  <Route 
    path="/basismodule/:id" 
    element={
      <BasismodulRouteGuard requiredFach="Mathematik">
        <BasismodulEditPage />
      </BasismodulRouteGuard>
    } 
  />
</Route>
```

## Integrations-Checkliste

### Bestehende Mutations aktualisieren:

- [ ] `components/einheiten/EinheitDetailView` – Update/Delete wrapped mit `useProtectedEinheitMutation`
- [ ] `components/basismodule/BasismodulDetailView` – Create/Update/Delete mit `useProtectedBasismodulMutation`
- [ ] `components/aufgaben/*` – Alle Mutations mit `useProtectedAufgabenbaustein`
- [ ] `components/workspace/*` – Strukturelle Ops mit `StructuralActionButton`

### App Router aktualisieren:

- [ ] Alle Edit/Detail-Routes mit `EinheitRouteGuard` oder `BasismodulRouteGuard` wrappen
- [ ] Fallback-Routes für "Zugriff verweigert"

### Workspace-Components aktualisieren:

- [ ] `WorkspaceDetailPanel` – `StructuralLockWarning` oben einbauen
- [ ] `SidebarTree` – Buttons disabled wenn Lock aktiv
- [ ] Alle Delete/Move-Buttons mit `StructuralActionButton` wrappen

## Sicherheits-Eigenschaften

✅ **API-Level:** Mutations werfen UNAUTHORIZED bevor API-Call gesendet wird  
✅ **Fachschafts-Isolation:** Fach-basierte Zugriffskontrolle auf Basismodule  
✅ **Concurrency:** Structural Locks deaktivieren schreibende Ops für andere User  
✅ **Route-Guards:** Direktaufrufe von Kunden-URLs werden blockiert/umgeleitet  
✅ **Feedback:** Toast-Notifications bei fehlender Berechtigung  
✅ **UX:** Disabled Buttons mit Tooltips statt Fehler-Meldungen  

## Testing-Szenarien

1. **Mutationen ohne Berechtigung:** User ohne Fachzuständigkeit versucht Basismodul zu ändern → Toast "Keine Berechtigung"
2. **Structural Lock:** User A bearbeitet Einheit → User B sieht Warning + disabled Buttons
3. **Route-Direktaufrufe:** User ohne Berechtigung ruft `/basismodule/edit/123` auf → Redirect zu `/einheiten`
4. **Cross-Role:** Admin kann alle bearbeiten, Lehrkraft nur im Fach