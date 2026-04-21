# Phase 1 Testing Guide: T1 Hard-Lock Szenario
**Datum:** 2026-04-21  
**Fokus:** Manual Testing des Export-Lock-Verhaltens  

---

## Übersicht: T1 Hard-Lock Test

**Ziel:** Validiere, dass der "Inhalt bearbeiten"-Button bei aktivem Export-Lock deaktiviert ist und die UI sicher gesperrt bleibt.

**Setup:** Lernpaket mit `moodle_sync_status === 'locked'` (simuliert laufenden Export)

---

## Test-Szenarien

### Szenario T1.1: Button ist disabled bei Export-Lock

**Vorbedingung:**
- Lernpaket mit Status `moodle_sync_status === 'locked'`
- ActivityMasterPanel ist geöffnet (Tab 4)

**Schritte:**
1. Navigiere zu einer beliebigen Aktivität in Tab 4
2. Beobachte den "Inhalt bearbeiten"-Button im Header
3. **Erwartetes Ergebnis:** Button ist **grau/disabled**
4. **Tooltip:** Hover über Button → "Einheit ist zur Moodle-Synchronisation gesperrt"

**Validierung:**
```javascript
// Browser DevTools > Elements
button.disabled === true ✓
button.title === "Einheit ist zur Moodle-Synchronisation gesperrt" ✓
button.style.opacity < 1 (visuell grau) ✓
```

---

### Szenario T1.2: Toast-Warnung vor Lock-Erwerb

**Vorbedingung:**
- Export-Lock ist aktiv
- Modal ist **nicht** geöffnet

**Schritte:**
1. Klicke auf den deaktivierten "Inhalt bearbeiten"-Button
2. **Erwartetes Ergebnis:** Klick funktioniert nicht (disabled)
   - Alternativ: Wenn Button via Keyboard erreichbar ist:
   - KeyDown Enter → Toast erscheint: "Einheit ist zur Moodle-Synchronisation gesperrt. Bitte später erneut versuchen."

**Validierung:**
```javascript
// Im Code: handleOpenEditModal wird gar nicht aufgerufen (Button disabled)
// Toast wird nur gezeigt, wenn Backend einen Fehler zurückgibt
```

---

### Szenario T1.3: Modal öffnet sich nicht bei Lock

**Vorbedingung:**
- Export-Lock ist aktiv
- Nutzer hat irgendwie ein Modal geöffnet bekommen (z.B. Race Condition)

**Schritte:**
1. Modal ist offen
2. Exportprozess setzt `moodle_sync_status = 'locked'` (Backend-Simulation)
3. Browser refetcht Lernpaket-Daten (5-Sekunden-Interval)
4. **Erwartetes Ergebnis:** Modal kann immer noch geschlossen werden (Abbrechen-Button bleibt enabled)
5. Nach dem Schließen ist der Button wieder disabled

**Validierung:**
```javascript
// Abbrechen-Button.disabled === false ✓
// Speichern-Button.disabled === true ✓
```

---

### Szenario T1.4: Badge zeigt "🔒 Moodle: In Arbeit"

**Vorbedingung:**
- `moodle_sync_status === 'locked'`

**Schritte:**
1. Beobachte die Badge im Activity-Header (rechts neben "Vollständig")
2. **Erwartetes Ergebnis:** Badge zeigt "🔒 Moodle: In Arbeit" in roter Farbe
3. Hover über Badge → Tooltip: "Moodle-Export läuft. Bitte warten…"

**Validierung:**
```javascript
// Badge.textContent === "🔒 Moodle: In Arbeit" ✓
// Badge.classList.contains("text-red-600") ✓
```

---

## Manual Database Setup für T1-Tests

### Option A: SQL direkt in der DB (Empfohlen)

**1. Test-Lernpaket identifizieren:**
```javascript
// Base44 Console im Browser
const lernpakete = await base44.entities.Lernpakete.list();
const testPackage = lernpakete[0]; // Wähle ein beliebiges
console.log(testPackage.id); // Notiere die ID
```

**2. Status auf "locked" setzen:**
```javascript
// Base44 Console
const packageId = "YOUR_LERNPAKET_ID";
await base44.entities.Lernpakete.update(packageId, {
  moodle_sync_status: 'locked',
  is_locked: true,
  locked_by_email: 'export@moodle.local',
  locked_at: new Date().toISOString(),
});
console.log("Export-Lock aktiviert");
```

**3. UI beobachten:**
- Warte 5 Sekunden (refetchInterval)
- Button sollte sich grau färben
- Badge sollte auf Rot springen

---

### Option B: Admin-Funktion (falls vorhanden)

Falls eine Admin-Funktion zum Setzen von Locks existiert:

```javascript
// Backend-Funktion aufrufen
await base44.functions.invoke('setExportLockForTesting', {
  lernpaket_id: 'YOUR_LERNPAKET_ID',
  duration_seconds: 300, // 5 Minuten
});
```

---

### Option C: Backend-Simulation via Test-Daten

In der `seedKurzgeschichten.js` oder einer Test-Fixture:

```javascript
// In einer Test-Setup-Funktion
const testLernpaket = await base44.entities.Lernpakete.create({
  einheit_id: testEinheit.id,
  titel_des_pakets: 'Test Package with Export Lock',
  reihenfolge_nummer: 999,
  moodle_sync_status: 'locked',  // ← Direkt locked bei Erstellung
  is_locked: true,
  locked_by_email: 'test-export@example.local',
  locked_at: new Date().toISOString(),
});

console.log(`Test-Paket erstellt mit Lock: ${testLernpaket.id}`);
```

---

## Testing-Checkliste für T1

| Schritt | Test | Status | Notizen |
|---------|------|--------|---------|
| T1.1a | Button ist disabled | [ ] | Visuell grau |
| T1.1b | Tooltip zeigt Grund | [ ] | Hover-Test |
| T1.2a | Klick funktioniert nicht | [ ] | Button ist disabled |
| T1.2b | Toast bei Backend-Fehler | [ ] | Nur wenn API antwortet |
| T1.3a | Modal bleibt geöffnet | [ ] | Nach Lock-Erwerb |
| T1.3b | Abbrechen funktioniert | [ ] | Button enabled |
| T1.3c | Speichern blockiert | [ ] | Button disabled |
| T1.4a | Badge zeigt Rot | [ ] | Status "In Arbeit" |
| T1.4b | Badge-Icon korrekt | [ ] | "🔒" sichtbar |
| T1.4c | Tooltip informativ | [ ] | Hover-Test |

---

## Automatisiertes Testing (Cypress/Playwright)

Falls E2E-Tests gewünscht:

### Cypress Test-Beispiel

```javascript
describe('T1: Hard-Lock Behavior', () => {
  beforeEach(() => {
    // Test-Lernpaket mit Lock vorbereiten
    cy.task('db:update', {
      entity: 'Lernpakete',
      id: 'test-package-123',
      data: {
        moodle_sync_status: 'locked',
        is_locked: true,
        locked_at: new Date().toISOString(),
      },
    });
  });

  it('T1.1: Button sollte disabled sein', () => {
    cy.visit('/workspace/test-einheit');
    cy.get('[data-testid="activity-edit-button"]').should('be.disabled');
  });

  it('T1.1b: Tooltip sollte sichtbar sein', () => {
    cy.visit('/workspace/test-einheit');
    cy.get('[data-testid="activity-edit-button"]')
      .trigger('hover')
      .should('have.attr', 'title', 'Einheit ist zur Moodle-Synchronisation gesperrt');
  });

  it('T1.4a: Badge sollte rot sein', () => {
    cy.visit('/workspace/test-einheit');
    cy.get('[data-testid="moodle-sync-badge"]')
      .should('have.text', '🔒 Moodle: In Arbeit')
      .should('have.class', 'text-red-600');
  });
});
```

---

## Cleanup nach Tests

**Nach T1-Tests muss der Lock entfernt werden:**

```javascript
// Base44 Console
await base44.entities.Lernpakete.update('test-package-123', {
  moodle_sync_status: 'synced', // oder vorherigen Status
  is_locked: false,
  locked_by_email: null,
  locked_at: null,
});
console.log("Test-Lock entfernt");
```

---

## Race-Condition Szenario (Advanced)

**Wenn ihr Race Conditions testen möchtet:**

1. Modal öffnen (Lock erworben vor UI-Check)
2. Parallel: Simuliere Export-Start
   ```javascript
   // In separatem Browser-Tab oder Backend-Call
   await base44.entities.Lernpakete.update(id, { moodle_sync_status: 'locked' });
   ```
3. Beobachte:
   - Badge springt von "Aktuell" zu "In Arbeit" (rot)
   - Speichern-Button wird disabled
   - Abbrechen-Button bleibt enabled ✓ (User kann Modal schließen)

---

## Fehlerbehebung

### Problem: Button bleibt enabled obwohl Lock gesetzt

**Ursachen:**
- Lernpaket-Query refetcht nicht
- `lernpaket?.moodle_sync_status` ist undefined

**Lösung:**
```javascript
// Browser DevTools
console.log(lernpaket?.moodle_sync_status); // Sollte 'locked' sein
console.log(lernpaket?.export_locked); // Oder export_locked = true
```

---

### Problem: Badge zeigt falschen Status

**Ursachen:**
- Activity-Record ist nicht aktualisiert
- Badge receives wrong props

**Lösung:**
```javascript
// Check Activity-Record
const activity = await base44.entities.LernpaketPhaseAktivitaet.get('activity-id');
console.log(activity.moodle_sync_status);

// Manual refetch triggern
queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
```

---

## Zusammenfassung

**Für schnelle T1-Validierung:**

1. Öffne Base44 Console im Browser
2. Führe aus:
   ```javascript
   const pkgs = await base44.entities.Lernpakete.list();
   const pkg = pkgs[0];
   await base44.entities.Lernpakete.update(pkg.id, {
     moodle_sync_status: 'locked',
     is_locked: true,
     locked_at: new Date().toISOString(),
   });
   ```
3. Warte 5 Sekunden (refetch)
4. Beobachte: Button gray + Badge red ✓

**Zeit zum Test:** ~2 Minuten (Vorbereitung + Validierung)