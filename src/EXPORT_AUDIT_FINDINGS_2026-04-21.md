# DRINGENDES AUDIT: Export-Sperre & Moodle-Synchronisations-Status
**Datum:** 2026-04-21  
**Scope:** Tab 3 (SidebarTree) & Tab 4 (TaskCreationView, Modale)  
**Status:** ⚠️ **KRITISCHE LÜCKEN GEFUNDEN**

---

## 1. EXPORT-SPERRE FÜR BEARBEITUNGS-MODALS

### Finding #1: **Fehlende Export-Lock-Prüfung in Tab 4** ❌

**Problem:** Der Button "Inhalt bearbeiten" (`ActivityMasterPanel.jsx:368`) berücksichtigt NICHT den globalen Export-Lock-Status der Einheit.

**Betroffene Komponente:** `ActivityMasterPanel.jsx` (Lines 366-372)
```javascript
{kannBearbeiten && (
  <div className="flex justify-end">
    <Button onClick={handleOpenEditModal} disabled={acquiringLock} className="gap-2">
      {acquiringLock
        ? <><Loader2 className="w-4 h-4 animate-spin" /> Sperren…</>
        : <><Pencil className="w-4 h-4" /> Inhalt bearbeiten</>}
    </Button>
  </div>
)}
```

**Issue:** Der Button wird nur auf `acquiringLock` geprüft, nicht auf Einheit-Level Export-Sperre.

**Risk:** 
- Benutzer können Modal öffnen, obwohl das Moodle-Team die Einheit zur Synchronisation gesperrt hat.
- Lock-Konflikt ist möglich.
- Pessimistic Locking wird nicht angewendet.

---

### Finding #2: **Kein Export-Lock-Status in Lernpaket-Query** ❌

**Problem:** `ActivityMasterPanel.jsx` (Line 133-139) lädt zwar das Lernpaket, aber prüft NICHT auf `export_locked` oder `moodle_sync_status`.

```javascript
const { data: lernpaket } = useQuery({
  queryKey: ['lernpakete', activityRecord?.lernpaket_id],
  queryFn: () => base44.entities.Lernpakete.filter({ id: activityRecord.lernpaket_id }),
  select: (data) => data[0],
  enabled: !!activityRecord?.lernpaket_id,
  refetchInterval: 5000,
});
```

**Expected:** Query sollte auch `moodle_sync_status`, `last_synced_at`, und Lock-Status prüfen.

---

### Finding #3: **Modal-Öffnung blockiert nicht bei Export-Status** ❌

**Betroffene Funktion:** `handleOpenEditModal` (Lines 199-206)

```javascript
const handleOpenEditModal = async () => {
  setAcquiringLock(true);
  const ok = await acquireLock();  // ← Nur Lernpaket-Level, nicht Export-Level
  setAcquiringLock(false);
  if (!ok) return;
  onEditModeChange?.(true);
  setEditModalOpen(true);
};
```

**Issue:** `acquireLock()` prüft NICHT auf `export_locked` oder Moodle-Sync-Status.

**Empfehlung:** Vor `acquireLock()` Einheit-Export-Status prüfen.

---

## 2. MOODLE-STATUS IM HEADER

### Finding #4: **Fehlende Sync-Status-Anzeige in ActivityMasterPanel Header** ❌

**Problem:** Der Header (Lines 325-341) zeigt NUR:
- Lernpaket-Name
- Aktivitäts-Name
- Phase
- Completion-Badge (✓ Vollständig / ⚠ Unvollständig)

**Missing:**
- `moodle_sync_status` (new, pending, synced, error)
- `last_synced_at` (Zeitstempel)
- Synchronisations-Warnung: "⚠ Geänderte Fassung - Export-Update erforderlich"

**Current Header:**
```jsx
<div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
  <div className="min-w-0">
    {parentLernpaketName && (...)}
    <h2 className="text-base font-semibold truncate">{catalogEntry?.name || 'Aktivität'}</h2>
    <p className="text-xs text-muted-foreground mt-0.5">Phase: {activityRecord?.phase}</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    {effectivelyComplete ? (...) : (...)}
  </div>
</div>
```

**Expected:** Status-Badge für Moodle-Sync soll hier erscheinen.

---

### Finding #5: **Keine visuelle Unterscheidung zwischen Sync-Status** ❌

**Problem:** `moodle_sync_status === 'modified'` wird in Tab 4 nicht angezeigt.

**Expected Status-Anzeigen:**
- ✓ **Synchron:** "✓ Identisch mit Moodle-Version" (Grün)
- ⚠ **Geändert:** "⚠ Geänderte Fassung - Export-Update erforderlich" (Orange/Rot)
- 🔄 **Pending:** "🔄 Export läuft..." (Blau)
- ❌ **Error:** "❌ Sync-Fehler aufgetreten" (Rot)

---

## 3. RESET VON CONTENT_STATUS NACH BEARBEITUNG

### Finding #6: **content_status wird bei Änderungen NICHT zurückgesetzt** ⚠️

**Problem:** In `TextLesenModal.jsx` und `LueckentextWysiwygModal.jsx` wird der `content_status` korrekt im Footer togglebar angezeigt (ReleaseStatusToggle), ABER:

1. Wenn eine **bereits exportierte** Aktivität (`moodle_sync_status === 'synced'`) geändert wird, SOLLTE der `content_status` automatisch zu `draft` zurückgesetzt werden.
2. Derzeit wird dies nicht erzwungen — der Benutzer könnte eine Änderung speichern und den Status weiterhin auf `approved` lassen.

**Current Behavior:**
```javascript
// In TextLesenModal.jsx, handleSave():
onSave?.({ ...fieldValues, content_status: isReleased ? 'approved' : 'draft' });
```

**Expected Behavior:**
```javascript
// Pseudo-Code: Bei Änderung eines bereits exportierten Items
if (moodle_sync_status === 'synced' && hasChanges) {
  // Automatisch zu draft setzen
  onSave?.({ 
    ...fieldValues, 
    content_status: 'draft',  // ← Force draft
    sync_status: 'modified'   // ← Mark as changed
  });
}
```

---

## 4. RÜCKGABE DURCH MOODLE-TEAM

### Finding #7: **Keine Lock-Freigabe-Logik nach Moodle-Sync** ❌

**Problem:** Wenn das Moodle-Team den Sync im Backend abschließt (z.B. `moodle_sync_status` auf `synced` setzen), gibt es keine Logik, die:

1. Die Einheit wieder für den Pool Manager freigibt
2. Lock-Status zurückgesetzt wird
3. Frontend neu laden wird mit neuem Status

**Missing:**
- Backend-Logik: `checkAndReleaseDualLock()` oder äquivalente Funktion
- Frontend: Real-time Polling oder WebSocket-Listener für Sync-Completion

**Current Gap:** 
- Tab 4 wird den aktualisierten `moodle_sync_status` nicht automatisch zeigen
- Benutzer sieht nicht, wann das Moodle-Team fertig ist

---

## 5. ZUSAMMENFASSUNG DER KRITISCHEN LÜCKEN

| Nr. | Issue | Komponente | Severity | Fix-Aufwand |
|-----|-------|-----------|----------|------------|
| #1 | Keine Export-Lock-Prüfung in "Inhalt bearbeiten" | ActivityMasterPanel | 🔴 KRITISCH | Mittel |
| #2 | Export-Status nicht in Lernpaket-Query | ActivityMasterPanel | 🔴 KRITISCH | Klein |
| #3 | Modal-Öffnung blockiert nicht bei Export | ActivityMasterPanel | 🔴 KRITISCH | Mittel |
| #4 | Moodle-Status nicht im Header | ActivityMasterPanel | 🟠 HOCH | Klein |
| #5 | Keine Sync-Status-Badges | ActivityMasterPanel | 🟠 HOCH | Klein |
| #6 | content_status wird bei Changes nicht reset | TextLesenModal, LueckentextWysiwygModal | 🟠 HOCH | Mittel |
| #7 | Keine Lock-Freigabe nach Moodle-Sync | Backend + Frontend | 🟠 HOCH | Groß |

---

## RECOMMENDATIONS

### Phase 1: **Sofortige Fixes** (1-2 Tage)

1. **Export-Lock vor Modal-Öffnung prüfen:**
   ```javascript
   // In ActivityMasterPanel.handleOpenEditModal():
   const canEdit = lernpaket?.moodle_sync_status !== 'synced' || 
                   !lernpaket?.export_locked;
   if (!canEdit) {
     toast.error('Einheit ist zur Moodle-Synchronisation gesperrt.');
     return;
   }
   ```

2. **Moodle-Status im Header anzeigen:**
   ```javascript
   // Nach Completion-Badge
   {lernpaket?.moodle_sync_status && (
     <MoodleSyncStatusBadge status={lernpaket.moodle_sync_status} lastSynced={lernpaket.last_synced_at} />
   )}
   ```

3. **content_status Auto-Reset bei synced Items:**
   ```javascript
   // In Modalen vor onSave():
   let finalStatus = isReleased ? 'approved' : 'draft';
   if (lernpaket?.moodle_sync_status === 'synced' && changedFields.length > 0) {
     finalStatus = 'draft'; // Force draft für Re-Export
   }
   ```

### Phase 2: **Backend-Integration** (2-3 Tage)

4. **checkAndReleaseDualLock() prüfen:**
   - Existiert diese Funktion in `functions/checkAndReleaseDualLock.js`?
   - Wird sie nach Moodle-Sync aufgerufen?

5. **Real-Time Sync-Status-Updates:**
   - WebSocket/Polling für `moodle_sync_status` Änderungen
   - Oder: `refetchInterval` in Lernpaket-Query erhöhen

### Phase 3: **Testing & Validation**

6. **Test-Szenarien:**
   - [ ] Export-Lock vorhanden → Button deaktiviert ✓
   - [ ] Änderung in synced Item → Status reset zu draft ✓
   - [ ] Nach Moodle-Sync → Lock freigegeben ✓
   - [ ] Sync-Fehler → Error-Badge angezeigt ✓

---

## NEXT STEPS

1. **Sofort implementieren:** Finding #1, #2, #3, #4, #5
2. **Parallel:** Backend-Validierung für Finding #6, #7
3. **Dann:** Integration testen mit Moodle-Sync-Workflow
4. **Final:** Audit wiederholen nach Fixes

---

## AUDIT-SIGN-OFF

**Auditor:** Base44 AI  
**Datum:** 2026-04-21  
**Status:** ⚠️ **READY FOR IMPLEMENTATION**

Die neuen Modal- und Sidebar-Umbauten haben die bestehende Export-Logik teilweise beschädigt. Die identifizierten Lücken müssen vor der produktiven Nutzung geschlossen werden.