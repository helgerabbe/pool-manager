# Phase 1: Erweiterte Test-Matrix & T2-Vorbereitung
**Datum:** 2026-04-21  
**Fokus:** Verwaisdte Modal-Szenarien + T2 (Status-Reset-Validierung)  

---

## Test-Matrix: Das "Verwaisste" Modal

**Szenario:** Nutzer arbeitet im Modal, während parallel der Export startet.

### Ablauf-Tabelle

| Zeitpunkt | Aktion | Lock-Status | Ergebnis | Validierung |
|-----------|--------|------------|----------|-------------|
| **T0** | User A öffnet Modal für Aktivität | `is_locked = true` (Edit-Mode) | Modal geöffnet, Bearbeitung aktiv | [ ] Modal sichtbar, Felder editable |
| **T0+2s** | Export-Prozess startet (Backend) | `moodle_sync_status = 'pending'` | Badge wechselt zu Orange/Gelb | [ ] Badge-Farbe aktualisiert |
| **T0+5s** | Export-Server sperrt Einheit | `moodle_sync_status = 'locked'` | **KRITISCH:** Warn-Banner erscheint, Speichern-Button wird disabled | [ ] Banner sichtbar, Button grau |
| **T0+8s** | User A beobachtet Banner & klickt Abbrechen | Modal wird geschlossen | `is_locked` (Edit) freigegeben, aber `moodle_sync_status` = 'locked' bleibt | [ ] Modal schließt, Edit-Lock weg |
| **T0+15s** | Andere User B versucht zu bearbeiten | Button ist disabled (weil export_locked) | User B sieht deaktivierten Button, versteht "wird gerade synchronisiert" | [ ] Button grau für User B |
| **T0+120s** | Export abgeschlossen (Backend setzt 'synced') | `moodle_sync_status = 'synced'` | Badge wechselt zurück zu Grün, Button wird wieder enabled | [ ] Badge grün, Button aktiv |

### Zu Validierende Punkte

```
✓ T1: Warn-Banner mit korrektem Text
✓ T2: Speichern-Button wird sofort disabled (nicht nach 5 Sek)
✓ T3: Abbrechen-Button bleibt enabled (Nutzer kann raus)
✓ T4: Edit-Lock wird korrekt freigegeben (nicht vergessen!)
✓ T5: export_locked bleibt bestehen bis zum Abschluss
✓ T6: Andere Nutzer sehen auch deaktivierten Button
✓ T7: Nach Export-Abschluss normaler Zustand wiederhergestellt
```

---

## "Gefangen-Gefühl"-Test (UX-Audit)

**Was darf NICHT passieren:**

| Problem | Alte Implementierung | Neue Implementierung | Test |
|---------|--------------------|--------------------|------|
| **Abbrechen-Button disabled** | ❌ Beide Buttons grau | ✅ Nur Speichern grau | Modal → Export startet → Kann immer noch abbrechen [ ] |
| **Fehlende Erklärung** | ❌ Button grau, kein Text | ✅ Warn-Banner erklärt | Banner mit Text sichtbar [ ] |
| **Nutzer weiß nicht warum** | ❌ Tooltip nur bei Hover | ✅ Proaktives Banner + Tooltip | Banner automatisch sichtbar [ ] |
| **Lock wird nicht freigegeben** | ❌ Timeout erforderlich | ✅ Sofort beim Abbrechen | Edit-Lock weg nach Modal-Close [ ] |

---

## Berechtigungen & Dummy-Daten-Audit

### ✅ locked_by_email Validierung

**Wichtig:** Beim manuellen Lock-Setzen darauf achten:

```javascript
// ❌ FALSCH - könnte als normaler Nutzer-Lock interpretiert werden
await base44.entities.Lernpakete.update(id, {
  is_locked: true,
  locked_by_email: 'lehrer@schule.de', // ← Echte Nutzer!
  moodle_sync_status: 'locked',
});

// ✅ RICHTIG - System-Email, die kein echter Nutzer hat
await base44.entities.Lernpakete.update(id, {
  is_locked: true,
  locked_by_email: 'moodle-export-system@internal.local',
  moodle_sync_status: 'locked',
});
```

**Warum?** Die Badge-Logik könnte sonst denken, es handelt sich um einen "normalen" Bearbeitungs-Lock eines Kollegen (z.B. "Lehrer Max bearbeitet gerade").

**Test-Validierung:**
```javascript
// Nach Lock-Setzen:
const lernpaket = await base44.entities.Lernpakete.get(id);
console.assert(
  lernpaket.locked_by_email.includes('moodle') || lernpaket.locked_by_email.includes('system'),
  'locked_by_email sollte System-Email sein'
);
```

---

## Cache-Invalidation: Das unbekannte Feature

### Problem: 5-Sekunden-Wartezeit beim Manual Testing

**Szenario:**
1. Du setzt in der Konsole: `moodle_sync_status = 'locked'`
2. UI reagiert... nichts passiert
3. Du wartest 5 Sekunden
4. Erst dann springt die Badge in Rot

**Ursache:** React Query's automatischer Refetch ist auf 5 Sekunden eingestellt.

### Lösung: Cache sofort invalidieren

```javascript
// Nach dem Lock-Update
import { queryClientInstance } from '@/lib/query-client';

await base44.entities.Lernpakete.update(packageId, {
  moodle_sync_status: 'locked',
});

// 🔴 SOFORT invalidieren
queryClientInstance.invalidateQueries({ 
  queryKey: ['lernpakete', packageId] // Spezifisches Paket
});

// Oder breiter für alle Lernpakete:
queryClientInstance.invalidateQueries({ 
  queryKey: ['lernpakete'] // Alle Lernpakete
});
```

### Timing-Vergleich

| Methode | Zeit | Verwendung |
|---------|------|-----------|
| **Ohne Invalidation** | ~5 Sek | Produktive Tests (User Experience) |
| **Mit Invalidation** | ~100-200ms | Manuelle Konsolen-Tests (QA/Debug) |

**Empfehlung:** Im Testing Guide **immer** `invalidateQueries` nutzen, damit Tests schneller ablaufen.

---

## T2: Der Nächste Test (Status-Reset-Validierung)

**T2 prüft die automatische Statusänderung:**

### T2.1: Basis-Szenario

**Setup:**
```javascript
// Aktivität mit synced-Status
const activity = {
  id: 'activity-123',
  moodle_sync_status: 'synced',  // ← Wichtig!
  content: 'Altes Lückentext-Inhaltsfeld'
};
```

**Schritte:**
1. Öffne das Lückentext-Modal
2. **Änderung vornehmen:** z.B. Rohtext von "Photosynthese findet in den Chloroplasten statt." zu "Photosynthese findet in den grünen Organellen (Chloroplasten) statt."
3. Klicke "Speichern"
4. **Prüfe in der Datenbank:**
   ```javascript
   const updated = await base44.entities.Aufgabenbausteine.get('activity-123');
   console.log(updated.moodle_sync_status); // Sollte 'modified' sein ✓
   console.log(updated.is_dirty_since_export); // Sollte true sein ✓
   ```

**Validierung:**
- [ ] Status in DB ist 'modified'
- [ ] `is_dirty_since_export` ist true
- [ ] Badge wechselt zu Orange (falls UI noch offen)
- [ ] Modal schließt sich sauber

---

### T2.2: Edge-Case: Speichern ohne Änderung

**Setup:**
```javascript
const activity = {
  moodle_sync_status: 'synced',
  lueckentext: '[Photosynthese] findet in den Chloroplasten statt.'
};
```

**Schritte:**
1. Öffne Modal
2. **Keine Änderung vornehmen** — nur "Speichern" klicken
3. Prüfe Status in DB

**Aktuelles Verhalten (Phase 1):**
```javascript
// Status wird TROTZDEM auf 'modified' gesetzt
const updated = await base44.entities.Aufgabenbausteine.get(id);
console.log(updated.moodle_sync_status); // 'modified' (konservativ)
```

**Erwartung für Phase 2 (mit isDirty):**
```javascript
// Mit isDirty-Check würde Status BLEIBEN 'synced'
console.log(updated.moodle_sync_status); // 'synced' (optimiert)
```

**Validierung für Phase 1:**
- [ ] Status ist 'modified' (konservativ, akzeptabel)
- [ ] Badge orange
- [ ] Nächster Export wird getriggert (unnötig, aber sicher)

---

### T2.3: Multiple Changes im selben Modal

**Setup:**
```javascript
// Aktivität mit 5 Lücken
const activity = {
  moodle_sync_status: 'synced',
  lueckentext: '[Wort1] ist [Wort2], [Wort3] und [Wort4] mit [Wort5]'
};
```

**Schritte:**
1. Öffne Modal
2. Ändere mehrere Wörter: `[Wort1]` → `[BesserWort1]`, entferne `[Wort3]`, füge `[WortNeu]` ein
3. Speichern

**Validierung:**
- [ ] ALLE Änderungen werden synchron in eine Änderung zusammengefasst
- [ ] Status wird **einmal** auf 'modified' gesetzt (nicht mehrfach)
- [ ] DB zeigt neuen Lückentext mit allen Änderungen

---

## T2-Testing-Checkliste

| Test | Schritt | Expected | Validierung |
|------|---------|----------|-------------|
| **T2.1a** | Open synced activity | Modal öffnet sich | [ ] |
| **T2.1b** | Change content | Feld zeigt Änderung | [ ] |
| **T2.1c** | Click Save | Modal schließt | [ ] |
| **T2.1d** | Check DB status | `moodle_sync_status === 'modified'` | [ ] |
| **T2.1e** | Check UI badge | Badge wird Orange | [ ] |
| **T2.2a** | Open synced activity | Modal öffnet sich | [ ] |
| **T2.2b** | No change, just Save | Modal schließt | [ ] |
| **T2.2c** | Check DB status | `moodle_sync_status === 'modified'` (Phase 1 konservativ) | [ ] |
| **T2.3a** | Open activity with 5 blanks | Alle 5 Wörter sichtbar | [ ] |
| **T2.3b** | Edit multiple | Alle Felder ändern | [ ] |
| **T2.3c** | Save once | Modal schließt mit 1 Update | [ ] |
| **T2.3d** | Check DB | Alle Änderungen gespeichert | [ ] |

---

## Quick-Start für T2-Tests

**In Base44 Konsole:**

```javascript
// 1. Aktivität mit synced-Status finden
const activities = await base44.entities.Aufgabenbausteine.filter({ 
  moodle_sync_status: 'synced' 
});
const testActivity = activities[0];
console.log(`Testing Activity: ${testActivity.id}`);

// 2. Öffne Modal in der UI (manuell)
// → Ändere Inhalt
// → Klicke Speichern

// 3. Prüfe Status nach Speichern
const updated = await base44.entities.Aufgabenbausteine.get(testActivity.id);
console.log(`Status nach Speichern: ${updated.moodle_sync_status}`);
console.assert(updated.moodle_sync_status === 'modified', 'Status sollte modified sein');

// 4. Cleanup: Status zurücksetzen für nächsten Test
await base44.entities.Aufgabenbausteine.update(testActivity.id, {
  moodle_sync_status: 'synced'
});
console.log('Test-Status zurückgesetzt.');
```

---

## T2 im Kontext der "Moodle-Sicherheitsschleuse"

### Sicherheits-Logik-Kette

```
T1: Hard-Lock (Sperre während Export)
    ↓
    UI-Buttons deaktiviert
    Warn-Banner zeigt sich
    ↓
T2: Dirty-Tracking (Was wurde geändert?)
    ↓
    Änderte Aktivitäten → moodle_sync_status = 'modified'
    Badge wechselt Farbe (Orange)
    ↓
T3: Re-Export-Tracking (Wurde es erneut exportiert?)
    ↓
    Export-Prozess prüft alle 'modified'-Aktivitäten
    Setzt sie wieder auf 'synced'
    ↓
T4: Cycle-Completion (Lebenszyklu abgeschlossen)
    ↓
    Alle Daten sind konsistent
    UI zeigt nur noch grüne Badges
```

**T2 ist der kritische Punkt**, an dem die Datenkonsistenz SICHERGESTELLT wird. Ohne korrekte Dirty-Flagging können Änderungen unbemerkt vor dem Moodle-Export stattfinden.

---

## Fehlerbehebung: T2-Spezifisch

### Problem: Status bleibt 'synced' statt auf 'modified' zu springen

**Ursachen:**
1. `initialData.moodle_sync_status` ist undefined
2. Conditional-Logic in `handleSave` wird nicht getriggert
3. Mutation war erfolgreich, aber Query invalidiert nicht

**Debugging:**
```javascript
// In TextLesenModal, in handleSave():
console.log('initialFieldValues.moodle_sync_status:', initialFieldValues.moodle_sync_status);
console.log('Payload wird gesendet:', payload);

// Nach Speichern: Query-Status prüfen
console.log('Mutation erfolgreich?', saveFieldsMutation.isSuccess);
console.log('Query wurde invalidiert?', queryClient.isFetching({ queryKey: [...] }));
```

**Lösung:**
- Stelle sicher, dass `initialData.moodle_sync_status` korrekt übergeben wird
- Prüfe, dass `queryClient.invalidateQueries` aufgerufen wird
- Nutze React Query DevTools (Browser Extension) zur Echtzeit-Überwachung

---

## Zusammenfassung: Phase 1 → Phase 2 Handoff

### ✅ Phase 1 schließt mit T1 ab
- Hard-Lock funktioniert
- Warn-Banner erklärt Nutzer die Situation
- UI ist sicher vor Bearbeitung während Export

### ⏳ Phase 2 beginnt mit T2
- Status-Reset-Validierung
- isDirty-Optimierung (optional)
- Re-Export-Lifecycle

### 🔐 Die gesamte "Sicherheitsschleuse"
```
┌─────────────────────────────────────────────┐
│  MOODLE-SICHERHEITSSCHLEUSE (T1-T4)         │
├─────────────────────────────────────────────┤
│ T1: Hard-Lock bei Export                    │
│ T2: Dirty-Tracking nach Änderung            │
│ T3: Re-Export nur von geänderten Items      │
│ T4: Zyklisches Konsistenz-Check             │
└─────────────────────────────────────────────┘
```

Mit T1 + T2 sind die kritischsten Punkte abgedeckt. T3 & T4 sind Backend-assoziiert und folgen danach.