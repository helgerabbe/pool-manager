# Sidebar-Synchronisierungs-Bericht

## Ziel
Konsistente visuelle Darstellung des Aktivitäts-Status im Menübaum (Sidebar) mit dem Inhaltsfenster (Main Panel) — keine Widersprüche zwischen Warn-Icons und Freigabe-Status-Farben.

---

## 1. Behebung der Vollständigkeits-Inkonsistenz

### Problem
Das gelbe Warn-Icon (!) im Menübaum wurde asynchron zur Detailansicht gerendert, was zu Zustandswidersprüchen führte.

### Lösung: Vereinheitlichte Validierungs-Logik

#### In `SidebarTree.jsx`
- **Neue Logik für `AktivitaetSubNode`**: Die Farbe richtet sich nach `content_status`:
  - **Freigegeben** (`content_status === 'approved'`) → **Text-Farbe grün** (`text-green-600`)
  - **Nicht freigegeben** (`content_status !== 'approved'`) → **Text-Farbe orange** (`text-orange-600`)
  
- **Warn-Icon nur bei bestimmten Bedingungen**:
  - Nur wenn `!activity.is_complete && a.content_status !== 'approved'`
  - D. h. das Warn-Icon verschwindet sofort, wenn Inhalt freigegeben wird (auch wenn noch unvollständig)

#### Betroffene Funktionen:
1. **`AktivitaetSubNode()`** — Aktivitäts-Element in der Phase
   - Liest `activity.content_status` 
   - Setzt Farbe dementsprechend
   - Zeigt Warn-Icon nur wenn unvollständig UND draft

2. **`PhaseNode()`** — Phase-Header (Input/Übung/Abschluss)
   - Berechnet `hasIncompleteActivity` mit Update:
     ```javascript
     const hasIncompleteActivity = activities.some(a => !a.is_complete && a.content_status !== 'approved');
     ```
   - Warn-Icon nur wenn unvollständig UND draft

3. **`LernpaketNode()`** — Lernpaket-Ordner
   - Gleiche Logik:
     ```javascript
     const hatUnvollstaendigeAktivitaet = paketPhaseActivities.some(a => !a.is_complete && a.content_status !== 'approved');
     ```

4. **`ThemenfeldNode()`** — Themenfeld-Container
   - Gleiche Logik bei unvollständigen Aktivitäten-Check

---

## 2. Visuelle Darstellung des Freigabe-Status (Farbcodes)

### Farb-Schema
| Status | Text-Farbe | Bedeutung |
|--------|------------|-----------|
| `content_status === 'approved'` | `text-green-600` | Freigegeben für Lernende |
| `content_status === 'draft'` | `text-orange-600` | In Bearbeitung / Entwurf |

### Implementierung
In `AktivitaetSubNode`:
```javascript
const isReleased = activity.content_status === 'approved';
const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
```

Die Farbe wird direkt in die `className` eingebunden:
```javascript
<div className={cn(
  'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[11px]',
  textColor
)}>
```

---

## 3. Echtzeit-Update nach Modal-Nutzung

### Trigger-Punkt: Query-Invalidation

Nach Modal-Speicherungen werden beide Queries invalidiert:

#### In `ActivityMasterPanel.jsx`
```javascript
onSuccess: () => {
  // Aktivitäts-Query + Sidebar-Status invalidieren
  queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
  setIsDirty(false);
  toast.success('Gespeichert.');
}
```

#### In `MasterAufgabeCard.jsx`
```javascript
onSuccess: async () => {
  if (content_status) {
    await base44.entities.MasterAufgabe.update(master.id, { content_status });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
    // Zusätzlich: Aktivitäts-Query für Sidebar-Sync
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
  }
  handleCloseLueckentextModal();
}
```

### Ablauf
1. Nutzer öffnet Modal (z. B. `TextLesenModal` oder `LueckentextWysiwygModal`)
2. Nutzer speichert Änderungen → Modal schließt sich
3. Backend speichert `content_status: 'approved'` / `draft`
4. `queryClient.invalidateQueries()` triggert Re-Fetch
5. Sidebar re-rendert mit aktualisiertem Status
6. Farbe wechselt sofort von Orange zu Grün
7. Warn-Icon verschwindet automatisch

---

## 4. Datenfluss: Single Source of Truth

### Hierarchie der Datenquellen
```
DB: LernpaketPhaseAktivitaet.content_status
    ↓
    ActivityMasterPanel / TextLesenModal
    ↓
    Modal speichert → DB.content_status = 'approved' | 'draft'
    ↓
    queryClient.invalidateQueries()
    ↓
    SidebarTree liest aktualisierte data
    ↓
    AktivitaetSubNode rendert mit neuer Farbe
```

### Daten-Struktur
```javascript
// LernpaketPhaseAktivitaet Entity
{
  id: "...",
  lernpaket_id: "...",
  phase: "Input",
  aktivitaet_id: "...",
  field_values: { /* Inhaltsfelder */ },
  content_status: "approved" | "draft", // ← Steuert Freigabe-Status
  is_complete: true | false              // ← Steuert Warn-Icon
}
```

---

## 5. Implementierte Änderungen

### Dateien angepasst:
1. **`components/workspace/SidebarTree.jsx`**
   - `AktivitaetSubNode()` — Farbe + Warn-Icon Logik
   - `PhaseNode()` — Unvollständigkeits-Check
   - `LernpaketNode()` — Unvollständigkeits-Check
   - `ThemenfeldNode()` — Unvollständigkeits-Check

2. **`components/workspace/ActivityMasterPanel.jsx`**
   - `saveFieldsMutation` → invalidiert `lernpaketPhaseAktivitaeten`

3. **`components/workspace/MasterAufgabeCard.jsx`**
   - `onSave` Callback → invalidiert `lernpaketPhaseAktivitaeten` nach Master-Update

---

## 6. Behavior nach Implementierung

### Szenario 1: Aktivität wird als "Fertig" (approved) markiert
1. Nutzer klickt Modal-Speichern mit "Freigeben" aktiviert
2. Backend speichert `content_status: 'approved'`
3. Sidebar invalidiert und re-rendert
4. **Ergebnis**: 
   - Text-Farbe wechselt zu Grün
   - Warn-Icon verschwindet (auch wenn noch nicht alle Felder gefüllt)

### Szenario 2: Aktivität wird zurück zu "Entwurf" gesetzt
1. Nutzer deaktiviert "Freigeben"-Toggle
2. Backend speichert `content_status: 'draft'`
3. Sidebar invalidiert
4. **Ergebnis**:
   - Text-Farbe wechselt zu Orange
   - Warn-Icon erscheint wieder (wenn unvollständig)

### Szenario 3: Unvollständige freiggegebene Aktivität
- Text-Farbe: **Grün** (freigegeben)
- Warn-Icon: **Nicht sichtbar** (weil freigegeben)
- ✅ Kein Widerspruch

---

## 7. Testing-Checkliste

- [ ] Aktivität mit `content_status: 'draft'` + `is_complete: false` → Orange Text + Warn-Icon
- [ ] Aktivität mit `content_status: 'approved'` + `is_complete: true` → Grün Text, kein Warn-Icon
- [ ] Aktivität mit `content_status: 'approved'` + `is_complete: false` → Grün Text, kein Warn-Icon
- [ ] Nach Modal-Speicherung mit "Freigeben" → Sofort grün + Warn-Icon weg
- [ ] Nach Modal-Speicherung ohne "Freigeben" → Bleibt orange + Warn-Icon (wenn unvollständig)
- [ ] Alle Hierarchie-Ebenen (Aktivität → Phase → Lernpaket → Themenfeld) korrekt synchronisiert

---

## 8. Technische Notizen

### Warum `content_status` und nicht `is_complete` für die Farbe?
- `is_complete` = Datenvalidierung (alle Pflichtfelder gefüllt?)
- `content_status` = Freigabe-Status (darf Lernender sehen?)
- Die Farbe muss den **Freigabe-Intent** abbilden, nicht die technische Vollständigkeit

### Warum nicht einfach das Warn-Icon entfernen?
- Das Icon ist ein wichtiger visueller Hinweis für unvollständige Aufgaben
- Aber: Wenn Inhalt explizit freigegeben wurde, ist das Icon missleiterisch
- Lösung: Icon nur bei `!is_complete && !is_released` zeigen

### Performance
- Query-Invalidation invalidiert den gesamten `lernpaketPhaseAktivitaeten` Schlüssel
- Das ist O(1) für den QueryClient und akzeptabel, da diese Query nicht riesig ist
- Alternativ könnte man selektiv updaten, aber das erhöht die Komplexität unnötig