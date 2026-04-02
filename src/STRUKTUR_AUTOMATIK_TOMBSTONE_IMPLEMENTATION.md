# Struktur-Automatik & Tombstone-Prinzip – Implementierung

## Überblick

Das 2-Signal-System wird auf die Struktur-Ebene (Ebene 1-3) angewendet:

| Ebene | Entity | content_status | sync_status | Logik |
|-------|--------|---|---|---|
| **1-2** | Einheiten, Themenfelder, Lernpakete | `'approved'` (auto) | `'new'` → `'modified'` | Struktur-Container, immer grün |
| **3** | Leere Aktivitäts-Hüllen | `'draft'` (forced) | `'new'` | Erzwingt Inhalt-Arbeit |
| **4** | Klone, Masters | User-controlled | normal lifecycle | Nutzer entscheidet über Freigabe |

---

## 1. Implizite Freigabe (Auto-Grün) für Strukturdaten

### Lernpaket erstellen

```javascript
// createLernpaketWithAutoApproval.js
const lernpaket = await base44.entities.Lernpakete.create({
  titel_des_pakets: title,
  einheit_id,
  reihenfolge_nummer,
  // ✅ AUTO-GRÜN: Struktur-Container
  content_status: 'approved',
  sync_status: 'new',
});
```

**Warum?** Lernpakete sind reine Struktur-Hüllen. Die pädagogische Qualität sitzt in den **Kind-Elementen** (Aktivitäten, Klone). Darum:
- `content_status: 'approved'` = Struktur ist fertig
- Inhalt-Prüfung passiert auf Kind-Ebene (Ebene 3-4)

### Lernpaket bearbeiten (Name, Reihenfolge)

```javascript
// updateLernpaketWithStatusManagement.js
const updated = await base44.entities.Lernpakete.update(lernpaket_id, {
  titel_des_pakets: newTitle, // Namensänderung
  // ✅ content_status bleibt IMMER 'approved'
  content_status: 'approved',
  // ✅ Sync: 'synced' → 'modified'
  sync_status: current.sync_status === 'synced' ? 'modified' : current.sync_status,
});
```

---

## 2. Explizite Sperre für leere Aktivitäten-Hüllen

### Aktivität einer Phase zuordnen

```javascript
// assignActivityToLernpaket.js
const activity = await base44.entities.LernpaketPhaseAktivitaet.create({
  lernpaket_id,
  aktivitaet_id, // Aus dem Katalog
  phase, // 'Input', 'Übung', 'Abschluss'
  field_values: {}, // LEER!
  is_complete: false,
  // 🔴 FORCED DRAFT: Erzwingt Inhalt-Arbeit
  content_status: 'draft',
  sync_status: 'new',
});
```

**Warum?** Diese Aktivität ist noch eine leere Hülle. Der Nutzer MUSS Inhalte hinzufügen:
- URL eingeben, Video hochladen, etc.
- Nur wenn alle Pflichtfelder gefüllt → `is_complete: true`
- Erst dann kann der Toggle zu `'approved'` gehen

---

## 3. Tombstone-Prinzip (Soft Delete)

### Lernpaket löschen

```javascript
// deleteLernpaketWithTombstone.js
// NICHT: await base44.entities.Lernpakete.delete(lernpaket_id);

// STATTDESSEN: UPDATE mit Tombstone-Markierung
const updated = await base44.entities.Lernpakete.update(lernpaket_id, {
  sync_status: 'to_delete', // 🪦 Tombstone
});
```

### Aktivität löschen

```javascript
// deleteActivityWithTombstone.js
const updated = await base44.entities.LernpaketPhaseAktivitaet.update(activity_id, {
  sync_status: 'to_delete', // 🪦 Tombstone
});
```

---

## 4. Filterung für die UI

### Normal UI (Ebene 1-4): Tombstones ausblenden

```javascript
// listLernpaketeExcludeTombstones.js
const all = await base44.entities.Lernpakete.list();
const visible = all.filter(lp => lp.sync_status !== 'to_delete');
// → Gelöschte Elemente sind für Nutzer unsichtbar
```

### Export-Center: Tombstones mit abrufen

```javascript
// Export-Center-Logik
const all = await base44.entities.Lernpakete.list();
// KEINE Filterung! Tombstones sind sichtbar für den Export-Manager
// → Export-Center weiß: "Diese Elemente sollen in Moodle gelöscht werden"
```

---

## Status-Übergänge

### Lernpaket-Lifecycle

```
[Erstellt]
  ↓
  sync_status: 'new' ← content_status: 'approved' (Auto-Grün)
  ↓
[Name geändert?]
  ↓
  sync_status: 'modified'
  ↓
[Export startet]
  ↓
  sync_status: 'pending'
  ↓
[In Moodle]
  ↓
  sync_status: 'synced'
  ↓
[Wieder geändert]
  ↓
  sync_status: 'modified'
  ↓
[Löschen]
  ↓
  sync_status: 'to_delete' ← 🪦 TOMBSTONE
```

### Aktivität-Lifecycle (leere Hülle)

```
[Zugeordnet]
  ↓
  content_status: 'draft' (forced), sync_status: 'new'
  ↓
[Inhalte ausgefüllt, User klickt "Fertig"]
  ↓
  content_status: 'approved'
  ↓
[Export startet]
  ↓
  sync_status: 'pending' → 'synced'
```

---

## Implementierungs-Checkliste

- ✅ `Lernpakete.json`, `Themenfeld.json`, `Einheiten.json` mit `content_status` + `sync_status`
- ✅ `createLernpaketWithAutoApproval.js` – Auto-Grün bei Erstellung
- ✅ `updateLernpaketWithStatusManagement.js` – Status-Übergänge bei Änderung
- ✅ `assignActivityToLernpaket.js` – Forced Draft für leere Hüllen
- ✅ `deleteLernpaketWithTombstone.js` – Soft Delete für Lernpakete
- ✅ `deleteActivityWithTombstone.js` – Soft Delete für Aktivitäten
- ✅ `listLernpaketeExcludeTombstones.js` – Filter für normale UI
- ✅ `listActivitiesExcludeTombstones.js` – Filter für Aktivitäten
- ✅ `contentStatusLogic.js` erweitert mit Struktur-Logik
- ⏳ Frontend-Integration: Komponenten müssen neue Funktionen aufrufen

---

## Frontend-Integration (Beispiele)

### Lernpaket erstellen

```jsx
// components/lernpakete/LernpaketForm.jsx
const handleCreate = async () => {
  const response = await base44.functions.invoke('createLernpaketWithAutoApproval', {
    title: formData.title,
    einheit_id: currentEinheit.id,
    reihenfolge_nummer: nextNumber,
    themenfeld_id: selectedThemenfeld?.id,
  });
  
  // Lernpaket ist sofort 'approved' (Auto-Grün)
  queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
};
```

### Aktivität zuordnen

```jsx
// components/workspace/TaskCreationView.jsx
const handleAssignActivity = async () => {
  const response = await base44.functions.invoke('assignActivityToLernpaket', {
    lernpaket_id: currentPaket.id,
    aktivitaet_id: catalogEntry.id,
    phase: 'Input',
  });
  
  // Neue Aktivität ist forced 'draft'
  // ContentStatusToggle zeigt: 🔴 In Bearbeitung
};
```

### Lernpaket löschen (Tombstone)

```jsx
// components/workspace/StrukturBoardEmbedded.jsx
const handleDelete = async () => {
  await base44.functions.invoke('deleteLernpaketWithTombstone', {
    lernpaket_id: paket.id,
  });
  
  // sync_status wird 'to_delete'
  // UI aktualisiert: Paket ist sofort unsichtbar (Tombstone gefiltert)
  queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
};
```

---

## Export-Center-Integration

Das Export-Center ruft **direkt** die Base44-API auf (ohne Filterung):

```javascript
// export/MoodleExportManager.js
const allLernpakete = await base44.entities.Lernpakete.list();
// ← KEINE Filterung! Tombstones sind sichtbar

const toDelete = allLernpakete.filter(lp => lp.sync_status === 'to_delete');
const toExport = allLernpakete.filter(lp => 
  lp.sync_status === 'pending' || lp.sync_status === 'modified'
);

// Export-Payload enthält: { delete: [...toDelete], update: [...toExport] }
```

---

## Notizen

1. **Struktur-Container sind immer grün:** Einheiten, Themenfelder, Lernpakete haben **keine inhaltliche Freigabe**. Die Prüfung sitzt in den Kind-Elementen.

2. **Leere Aktivitäts-Hüllen sind rote Warnung:** Wenn eine neue Aktivität zugeordnet wird, ist sie leer → forced `'draft'` erzwingt Arbeit.

3. **Tombstones bleiben in der DB:** Soft Delete ermöglicht es dem Export-Center, gelöschte Elemente zu erkennen und in Moodle zu löschen.

4. **UI filtert transparent:** Nutzer sehen keine Tombstones, aber das System kann damit arbeiten.