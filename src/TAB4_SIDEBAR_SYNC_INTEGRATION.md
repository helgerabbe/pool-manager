# Tab 4 Sidebar-Synchronisierung für Master-Aufgaben & Kopien

## Überblick

Die visuelle Status-Anzeige (Grün für `content_status === 'approved'`, Orange für `content_status !== 'approved'`) wurde erfolgreich auf **alle Ebenen** von **Tabulator 4** ausgeweitet — von der Aktivität bis hinunter zur einzelnen Kopie.

---

## Implementierte Änderungen

### 1. **KlonSubItem** — Kopien-Ebene
**Datei:** `components/workspace/TaskCreationView` (Lines 55-75)

**Logik:**
```javascript
const isReleased = klon.content_status === 'approved';
const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
const isIncomplete = !klon.is_complete;
```

**Verhalten:**
- ✅ **Freigegeben (Grün):** `content_status === 'approved'` → `text-green-600`
- 🟠 **Entwurf (Orange):** `content_status !== 'approved'` → `text-orange-600`
- **Warn-Icon:** Nur wenn `isIncomplete && !isReleased`
  - Verschwindet sobald Kopie auf „Freigegeben" gesetzt wird
  - Nicht sichtbar wenn bereits freigegeben

---

### 2. **MasterSubItem** — Master-Aufgaben-Ebene
**Datei:** `components/workspace/TaskCreationView` (Lines 77-160)

**Logik:**
```javascript
const isReleased = master.content_status === 'approved';
const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
const isIncomplete = !master.is_complete;
```

**Verhalten:**
- ✅ **Freigegeben (Grün):** `content_status === 'approved'` → `text-green-600` + ✓ Häkchen-Icon
- 🟠 **Entwurf (Orange):** `content_status !== 'approved'` → `text-orange-600` + ⚠️ Warn-Icon (wenn unvollständig)
- **Icon-Logik:**
  - Zeige `<AlertTriangle>` nur wenn `isIncomplete && !isReleased`
  - Zeige `<CheckCircle2>` nur wenn `isReleased` (statt vorher immer)

---

### 3. **ActivitySidebarItem** — Aktivitäts-Ebene in Tab 4
**Datei:** `components/workspace/TaskCreationView` (Lines 154-213)

**Logik:**
```javascript
const isReleased = activity.content_status === 'approved';
const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
```

**Verhalten:**
- ✅ **Freigegeben (Grün):** `content_status === 'approved'` → `text-green-600`
- 🟠 **Entwurf (Orange):** `content_status !== 'approved'` → `text-orange-600`
- **Warn-Icon:** Nur wenn `isIncomplete && !isReleased`
  - Konsistent mit Logik aus Tab 3 (AktivitaetSubNode)

---

## Farb-Schema (Zusammenfassung)

| Ebene | Zustand | Text-Farbe | Warn-Icon | Häkchen-Icon |
|-------|---------|-----------|-----------|------------|
| **Aktivität** | Freigegeben | `text-green-600` | ❌ Nein | — |
| | Entwurf (vollständig) | `text-orange-600` | ❌ Nein | — |
| | Entwurf (unvollständig) | `text-orange-600` | ✅ Ja (⚠️) | — |
| **Master** | Freigegeben | `text-green-600` | ❌ Nein | ✅ Ja (✓) |
| | Entwurf (vollständig) | `text-orange-600` | ❌ Nein | — |
| | Entwurf (unvollständig) | `text-orange-600` | ✅ Ja (⚠️) | — |
| **Kopie** | Freigegeben | `text-green-600` | ❌ Nein | — |
| | Entwurf (vollständig) | `text-orange-600` | ❌ Nein | — |
| | Entwurf (unvollständig) | `text-orange-600` | ✅ Ja (⚠️) | — |

---

## Real-Time Synchronisierung

### Query Invalidation
Nach jedem Speichervorgang im Modal werden folgende Queries automatisch invalidiert:

**In `MasterAufgabeCard` (z.B. LueckentextWysiwygModal):**
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
  // Sidebar wird automatisch neu gerendert mit neuen Status-Werten
}
```

**In `KlonDetailView`:**
```javascript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['klone'] });
}
```

### Cascade-Effekt
1. User speichert Master/Klon mit neuem `content_status`
2. Query wird invalidiert
3. `TaskCreationView` aktualisiert `alleMaster` oder `alleKlone`
4. `MasterSubItem` / `KlonSubItem` re-rendern mit neuer Farbe
5. **Sofort sichtbar:** Orange → Grün (oder umgekehrt)

---

## Datenfluss Beispiel

### Szenario: Kopie von Orange (Entwurf) zu Grün (Freigegeben)

```
Benutzer klickt "Speichern" in Modal
    ↓
KlonDetailView.saveMutation.mutate({ ... })
    ↓
Backend aktualisiert: Aufgabenbausteine.content_status = 'approved'
    ↓
onSuccess callback:
  - queryClient.invalidateQueries(['klone'])
  - (optional) Toast-Nachricht
    ↓
TaskCreationView re-fetched 'klone' Query
    ↓
alleKlone wird mit neuem Status aktualisiert
    ↓
KlonSubItem re-renders:
  - isReleased = true (weil content_status === 'approved')
  - textColor = 'text-green-600' (war 'text-orange-600')
  - Warn-Icon verschwindet
    ↓
✅ Sidebar zeigt sofort grüne Kopie
```

---

## Konsistenz mit Tab 3

Die Logik in Tab 4 ist **identisch** mit der bereits funktionierenden Logik in **Tab 3 (SidebarTree.jsx)**:

**Tab 3 (AktivitaetSubNode):**
```javascript
const isReleased = activity.content_status === 'approved';
const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
return (
  <div className={cn(..., textColor)}>
    ...
    {isIncomplete && !isReleased && (
      <AlertTriangle className="w-3 h-3 text-orange-500" />
    )}
  </div>
);
```

**Tab 4 (ActivitySidebarItem, MasterSubItem, KlonSubItem):**
```javascript
const isReleased = item.content_status === 'approved';
const textColor = isReleased ? 'text-green-600' : 'text-orange-600';
return (
  <div className={cn(..., textColor)}>
    ...
    {isIncomplete && !isReleased && (
      <AlertTriangle className="w-3 h-3 text-orange-500" />
    )}
  </div>
);
```

✅ **Identisches Verhalten auf allen Ebenen — Tab 3 und Tab 4 synchron!**

---

## Testing-Checkliste

### Tab 4 — Master-Aufgabe (Lückentext)
- [ ] Master im Entwurf: Orange + ⚠️ Icon (wenn unvollständig)
- [ ] Master speichern → freigeben: Orange → Grün, Icon verschwindet
- [ ] Kopie im Entwurf: Orange + ⚠️ Icon (wenn unvollständig)
- [ ] Kopie speichern → freigeben: Orange → Grün, Icon verschwindet
- [ ] Nach Speichern: Sidebar aktualisiert sich **sofort** (keine manuellen Refreshes)

### Tab 4 — Aktivitäts-Ebene
- [ ] Aktivität mit unvollständigen Masters: Orange Text + ⚠️ Icon
- [ ] Alle Masters freigeben → Aktivität wechselt zu Grün
- [ ] Aktivität-Hovereffekt funktioniert korrekt

### Konsistenz
- [ ] Tab 3 (SidebarTree.jsx) zeigt gleiche Farben wie Tab 4
- [ ] Beide Tabs synchronisieren nach jedem Speichern
- [ ] Kein Race Condition (lokale Edits vor Query Update)

---

## Edge Cases Berücksichtigt

1. ✅ **Lock-Umgang:** Icon-Logik berücksichtigt nicht den Lock-Status (nur Freigabe-Status)
2. ✅ **Unvollständig + Freigegeben:** Warn-Icon verschwindet (weil `!isReleased`)
3. ✅ **Mehrere Klone:** Jede Kopie hat eigenen Status (nicht gruppiert)
4. ✅ **Master mit 0 Klonen:** Master wird trotzdem farblich angezeigt (nicht versteckt)
5. ✅ **KI-Tutor:** Auch KI-Tutor-Masters folgen der Farb-Logik

---

## Zusammenfassung

✅ **Tab 4 ist jetzt vollständig synchronisiert:**
- Alle Ebenen (Aktivität → Master → Kopie) nutzen **identische Farb- & Icon-Logik**
- **Grün** = `content_status === 'approved'` (Moodle-Export freigegeben)
- **Orange** = `content_status !== 'approved'` (noch Entwurf)
- **Warn-Icon** verschwindet sofort bei Freigabe
- **Real-Time Updates** ohne manueller Refresh

Die Sidebar signalisiert jetzt **auf allen Ebenen** klar, welche Aufgaben freigegeben sind und welche noch im Entwurf.