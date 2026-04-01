# Phase 6.4 Nachtrag: Hard Block Pattern für HTTP 409

## Problem

Bei einem Speicherkonflikt (HTTP 409) darf der Benutzer **niemals** die Möglichkeit haben, seine lokalen Änderungen trotzdem zu speichern. Das würde zu Datenverlust oder Inkonsistenzen führen.

## Lösung: Hard Block Pattern

### 1. ConflictDialog.jsx — Nicht-dismissible Modal

**Eigenschaften**:
- ❌ Kein "Abbrechen" Button
- ❌ Kein "Trotzdem speichern" Button
- ❌ Kein Schließen via Escape-Taste
- ❌ Kein Schließen via Click-Outside
- ✅ Nur ein Button: "Aktuellen Stand laden"

```jsx
<Dialog
  open={open}
  onOpenChange={() => {}} // No-Op: Dialog kann nicht geschlossen werden
>
  <DialogContent
    onInteractOutside={(e) => e.preventDefault()} // Verhindere Click-Outside
    onEscapeKeyDown={(e) => e.preventDefault()}   // Verhindere Escape
  >
    <DialogTitle>Speicherkonflikt</DialogTitle>
    <DialogDescription>
      Diese Daten wurden von einer anderen Person aktualisiert.
      Um Inkonsistenzen zu vermeiden, müssen die aktuellen Daten geladen werden.
      Nicht gespeicherte Eingaben werden verworfen.
    </DialogDescription>
    <Button onClick={handleReload}>Aktuellen Stand laden</Button>
  </DialogContent>
</Dialog>
```

### 2. Integration in useSecureMutation

```javascript
export function useSecureMutation({
  mutationFn,
  onConflict, // ← NEW: Callback für 409 Conflicts
  ...
}) {
  return useMutation({
    onError: (error) => {
      if (error.isConflict?.()) {
        // Hard Block: Rufe onConflict auf (Komponente zeigt Dialog)
        if (onConflict) {
          onConflict(error);
        }
      }
      // Weitere Error-Handler...
    },
  });
}
```

### 3. Verwendung in Komponenten

```jsx
import ConflictDialog from '@/components/dialogs/ConflictDialog';
import { useSecureMutation } from '@/utils/useSecureMutation';

export function EinheitSettingsModal({ einheit }) {
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  const mutation = useSecureMutation({
    mutationFn: (data) => secureApi.updateEinheit(einheit.id, {
      ...data,
      version: einheit.version,
    }),
    onConflict: (error) => {
      // Zeige Hard Block Dialog
      setShowConflictDialog(true);
    },
    invalidateQueries: [['einheiten', einheit.id]],
  });

  return (
    <>
      {/* Dein Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {/* ... */}
      </Dialog>

      {/* Hard Block Conflict Dialog */}
      <ConflictDialog
        open={showConflictDialog}
        entityType="Einheit"
        queryKeysToInvalidate={[['einheiten'], ['einheiten', einheit.id]]}
      />
    </>
  );
}
```

## Flow: Was passiert bei Konflikt?

```
1. Benutzer klickt "Speichern"
   ↓
2. Frontend sendet Update mit version: 5
   ↓
3. Backend prüft: DB hat version 6 (anderer User hat Update gemacht)
   ↓
4. Backend antwortet HTTP 409 Conflict
   ↓
5. useSecureMutation onError fängt Fehler auf
   ↓
6. isConflict() ist true → ruft onConflict() auf
   ↓
7. Komponente setzt showConflictDialog = true
   ↓
8. ConflictDialog wird angezeigt (nicht-dismissible!)
   ↓
9. Benutzer klickt "Aktuellen Stand laden"
   ↓
10. handleReload() wird aufgerufen:
    - Invalidiere React Query Caches
    - Reload: window.location.reload() oder Custom Handler
   ↓
11. Seite aktualisiert sich, Benutzer sieht aktuelle Daten
```

## Edge Cases

### Edge Case 1: Dialog ist offen, Benutzer versucht Escape zu drücken

```javascript
onEscapeKeyDown={(e) => e.preventDefault()} // ← Escape wird ignoriert
```

Dialog bleibt offen.

### Edge Case 2: Dialog ist offen, Benutzer klickt auf Hintergrund

```javascript
onInteractOutside={(e) => e.preventDefault()} // ← Click-Outside wird ignoriert
```

Dialog bleibt offen.

### Edge Case 3: Benutzer öffnet DevTools und versucht zu hacken

```javascript
// HTML:
<button disabled>Schließen</button> // ← Kann nicht geklickt werden

// CSS:
pointer-events: none; // ← Click wird ignoriert

// Dialog API:
onOpenChange={() => {}} // ← Handler ist No-Op
```

Das Dialog kann nur über "Aktuellen Stand laden" geschlossen werden.

## Fehlerbehandlung

Falls der Reload fehlschlägt:

```javascript
const handleReload = async () => {
  try {
    // Invalidiere Caches
    for (const key of queryKeysToInvalidate) {
      await queryClient.invalidateQueries({ queryKey: key });
    }

    // Trigger Reload
    if (onReload) {
      onReload();
    } else {
      window.location.reload();
    }
  } catch (error) {
    console.error('Reload failed:', error);
    // Fallback: Force Reload
    window.location.href = window.location.pathname;
  }
};
```

## Testing: Hard Block Verification

```javascript
// Test 1: Dialog kann nicht via Escape geschlossen werden
const { rerender } = render(<ConflictDialog open={true} />);
fireEvent.keyDown(document, { key: 'Escape' });
expect(ConflictDialog).toBeInTheDocument(); // ← Bleibt offen!

// Test 2: Dialog kann nicht via Click-Outside geschlossen werden
fireEvent.click(document.body);
expect(ConflictDialog).toBeInTheDocument(); // ← Bleibt offen!

// Test 3: Nur "Aktuellen Stand laden" Button ist vorhanden
expect(screen.getByText('Aktuellen Stand laden')).toBeInTheDocument();
expect(screen.queryByText('Abbrechen')).not.toBeInTheDocument();
expect(screen.queryByText('Trotzdem speichern')).not.toBeInTheDocument();

// Test 4: Button triggert Reload
fireEvent.click(screen.getByText('Aktuellen Stand laden'));
expect(window.location.reload).toHaveBeenCalled();
```

## Dokumentation für Nutzer

Zeige diese Info in der Benutzer-Dokumentation:

---

### Speicherkonflikt: Was bedeutet das?

**Szenario**: Sie bearbeiten eine Einheit in Tab A. Gleichzeitig ändert Ihr Kollege die gleiche Einheit in Tab B und speichert.

**Resultat**: Sie versuchen zu speichern → Fehler "Speicherkonflikt"

**Warum passiert das?**
Das System schützt Ihre Daten vor Überschreiben! Wenn wir Ihre Änderungen speichern würden, würden wir die Änderungen Ihres Kollegen verlieren.

**Was tun?**
1. Klicken Sie auf "Aktuellen Stand laden"
2. Die Seite wird aktualisiert und zeigt die aktuelle Version
3. Vergleichen Sie die neuen Daten mit Ihren Änderungen
4. Bearbeiten Sie die Einheit erneut und speichern Sie

---

## Performance-Hinweise

- **Keine Optimistic Updates**: Bei 409 wird nichts gecacht, alles wird neu geladen
- **Query Invalidation**: Invalidiere nur die relevanten Queries (z.B. `['einheiten', id]`), nicht alles
- **Reload-Timing**: 500ms Delay vor window.location.reload(), damit UI-Updates durchlaufen

```javascript
setTimeout(() => {
  window.location.reload();
}, 500);
```

## Sicherheits-Aspekt

Dieses Hard Block Pattern erfüllt **Audit 6** (State Management):
- ✅ Keine Möglichkeit, Änderungen zu forcieren
- ✅ Datenkonsistenz wird garantiert
- ✅ Benutzer wird klar informiert
- ✅ Nur eine logische Aktion möglich: "Neu laden"