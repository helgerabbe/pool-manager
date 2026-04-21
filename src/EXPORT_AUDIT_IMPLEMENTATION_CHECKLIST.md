# Export-Audit Implementierungs-Checkliste
**Status:** ✅ PHASE 1 ABGESCHLOSSEN  
**Datum:** 2026-04-21

---

## Phase 1: Hard-Lock & Moodle-Status-Badges ✅

### ✅ 1.1 Hard-Lock Prüfung implementiert
**Komponente:** `ActivityMasterPanel.jsx`

- [x] Hard-Lock vor Modal-Öffnung prüfen (Line 198-208)
  - Prüft `lernpaket?.moodle_sync_status === 'locked'`
  - Prüft `lernpaket?.export_locked`
  - Toast-Fehlermeldung bei Lock

- [x] Button "Inhalt bearbeiten" deaktivieren bei Lock (Line 376)
  - `disabled={acquiringLock || lernpaket?.moodle_sync_status === 'locked' || lernpaket?.export_locked}`
  - Title-Tooltip für Benutzer

- [x] Logik auch in Modalen (TextLesenModal, LueckentextWysiwygModal)
  - `exportLocked` Prop hinzugefügt
  - Speichern-Buttons deaktiviert bei Lock
  - Abbrechen-Buttons auch deaktiviert (Sicherheit)

---

### ✅ 1.2 Moodle-Status-Badge implementiert
**Komponente:** `MoodleSyncStatusBadge.jsx` (neu)

- [x] Status-Typen mit Icons und Farben:
  - `synced` → ✓ Moodle: Aktuell (Blau)
  - `modified` → ⚠ Moodle: Veraltet (Orange)
  - `locked` → 🔒 Moodle: In Arbeit (Rot)
  - `error` → ❌ Moodle: Fehler (Rot)
  - `new` → ◎ Nicht exportiert (Grau)

- [x] Export-Lock hat Priorität:
  - `exportLocked === true` → zeigt "locked" Status (Rot)
  - Unabhängig vom aktuellen `moodle_sync_status`

- [x] Tooltips mit aussagekräftigen Beschreibungen

---

### ✅ 1.3 Badge in Header integriert
**Komponente:** `ActivityMasterPanel.jsx` (Header, Line 337-344)

- [x] Badge neben Completion-Badge angezeigt
- [x] Nimmt Daten aus Activity-Record:
  - `moodle_sync_status`
  - `last_synced_at`
  - `is_dirty_since_export`
  - Export-Locked-Status (von Lernpaket)

---

### ✅ 1.4 Automatischer Status-Reset implementiert
**Komponenten:** `ActivityMasterPanel`, `TextLesenModal`, `LueckentextWysiwygModal`

- [x] Bei Speicherung einer synced-Aktivität:
  - `moodle_sync_status` → `'modified'`
  - `is_dirty_since_export` → `true`
  - Erfolgt AUTOMATISCH (keine Benutzer-Aktion nötig)

- [x] Badge springt sofort von "Aktuell" zu "Veraltet" um:
  - Weil `moodle_sync_status` im Payload gesetzt wird
  - Query wird invalidiert → re-fetcht neue Daten
  - Component re-rendert mit neuem Status

**Implementation:**
```javascript
// In handleModalSave (ActivityMasterPanel):
if (activityRecord?.moodle_sync_status === 'synced') {
  enrichedValues.moodle_sync_status = 'modified';
  enrichedValues.is_dirty_since_export = true;
}

// In handleSave (TextLesenModal & LueckentextWysiwygModal):
if (initialFieldValues.moodle_sync_status === 'synced') {
  payload.moodle_sync_status = 'modified';
  payload.is_dirty_since_export = true;
}
```

---

## Phase 2: Backend-Validierung (AUSSTEHEND)

### ⏳ 2.1 Backend Lock-Call validieren
**Datei:** `functions/acquireStructuralLockSecure.js` oder equivalent

**TODO:** Vor Lock-Gewährung prüfen:
```javascript
// Pseudo-Code
const canAcquireLock = async (einheitId, userId) => {
  const einheit = await base44.entities.Einheiten.get(einheitId);
  
  // Hard-Lock: Wenn Export läuft, Lock ablehnen
  if (einheit.moodle_sync_status === 'locked') {
    throw new Error('Einheit ist zur Moodle-Synchronisation gesperrt');
  }
  
  // Ansonsten Lock erwerben
  return acquireLock(einheitId, userId);
};
```

**Status:** ⏳ AWAITING BACKEND INTEGRATION

---

### ⏳ 2.2 Status-Reset im Backend validieren
**Datei:** `functions/updateTaskWithStateTransition.js` oder equivalent

**TODO:** Bei Update einer synced-Activity:
```javascript
// Wenn moodle_sync_status === 'synced' und Daten geändert:
activity.moodle_sync_status = 'modified';
activity.is_dirty_since_export = true;
```

**Status:** ⏳ AWAITING BACKEND VALIDATION

---

## Phase 3: Testing & Validation (AUSSTEHEND)

### Test-Checkliste

**T1: Hard-Lock Funktionalität**
- [ ] Export läuft (status = 'locked')
- [ ] "Inhalt bearbeiten" Button ist deaktiviert ✓
- [ ] Tooltip zeigt Grund: "Einheit ist zur Moodle-Synchronisation gesperrt" ✓
- [ ] Modal kann nicht geöffnet werden
- [ ] Console-Workaround abgelehnt vom Backend ⏳

**T2: Moodle-Status-Badge**
- [ ] Badge zeigt "✓ Moodle: Aktuell" bei status='synced' ✓
- [ ] Badge zeigt "⚠ Moodle: Veraltet" bei status='modified' ✓
- [ ] Badge zeigt "🔒 Moodle: In Arbeit" bei exportLocked=true ✓
- [ ] Tooltip erscheint bei Hover ✓
- [ ] Farben sind korrekt (Blau, Orange, Rot) ✓

**T3: Automatischer Status-Reset**
- [ ] Synced Activity öffnen
- [ ] Badge zeigt "Aktuell"
- [ ] Feld ändern + Speichern
- [ ] Badge springt zu "Veraltet" ✓
- [ ] `moodle_sync_status` in DB = 'modified' ⏳

**T4: Konsistenz Tab 3 ↔ Tab 4**
- [ ] Badge erscheint in Tab 3 (SidebarTree) ⏳
- [ ] Badge erscheint in Tab 4 (ActivityMasterPanel) ✓
- [ ] Status ist in beiden Tabs synchron ⏳

---

## Implementation Summary

**Dateien geändert/erstellt:**
1. ✅ `components/workspace/MoodleSyncStatusBadge.jsx` (NEU)
2. ✅ `components/workspace/ActivityMasterPanel.jsx` (geändert)
3. ✅ `components/workspace/TextLesenModal.jsx` (geändert)
4. ✅ `components/workspace/LueckentextWysiwygModal.jsx` (geändert)

**Funktionalität:**
- ✅ Hard-Lock vor Modal-Öffnung
- ✅ Moodle-Status-Badges (5 Status-Typen)
- ✅ Status-Badge im Header integriert
- ✅ Automatischer Status-Reset beim Speichern
- ⏳ Backend-Validierung (abhängig von Backend-Integration)

**Nächste Schritte:**
1. Backend-Lock-Validierung prüfen & ggf. anpassen
2. Test-Szenarien T1-T4 durchlaufen
3. Tab 3 (SidebarTree) mit Badges ausstatten (ggf. Phase 2)
4. E2E-Tests für Moodle-Lifecycle

---

**Status:** Phase 1 ✅ | Phase 2 ⏳ | Phase 3 ⏳