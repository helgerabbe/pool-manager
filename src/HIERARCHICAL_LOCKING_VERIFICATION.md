# Hierarchisches Locking: Implementierung & Verifizierung

## Übersicht der Änderungen

### 1. Globaler Context für Lock-Management
**Datei:** `lib/LernpaketLockContext.jsx`

- Zentrale State-Verwaltung für `currentLockedLernpaketId` und `lockedByUser`
- Provider wraps die ganze App in `App.jsx`
- Alle Komponenten (Tab 3, Tab 4) lesen aus diesem gemeinsamen State
- `useLernpaketLockGlobal()` Hook für Zugriff

### 2. Backend: Hierarchische Lock-Validierung
**Datei:** `functions/updateActivitySecure.js`

**Änderung:** Die Funktion prüft nicht mehr auf einen Aktivitäts-Lock, sondern auf einen Lernpaket-Lock.

```javascript
// ALT: Prüfe Aktivitäts-Lock
const lockHeldByUser = aktivitaet.lock_status && aktivitaet.locked_by_user === user.email;

// NEU: Prüfe Parent-Lernpaket-Lock
const lernpaket = await base44.asServiceRole.entities.Lernpakete.get(aktivitaet.lernpaket_id);
const paketLockHeldByUser = lernpaket.lock_status && lernpaket.locked_by_user === user.email;
```

**Konsequenz:** Nur wenn das übergeordnete Lernpaket durch den User gesperrt ist, kann die Aktivität gespeichert werden.

### 3. Frontend: Lock-Verwaltung mit Heartbeat
**Datei:** `hooks/useLernpaketLockHierarchical.js`

- Hook für Tab 3 (Lernpaket-Bearbeitung)
- Verwaltet Lock-Lifecycle (acquire, release, force unlock)
- Heartbeat validiert den Lock alle 15 Sekunden
- Bei Heartbeat-Fehler: `globalLock.clearLock()` für synchrone UI-Reaktion
- Lock wird beim Browser-Unload freigegeben

### 4. Frontend: Aktivitäten erben Lock vom Parent
**Datei:** `components/workspace/ActivityLockAwareWrapper.jsx`

- Wrapper-Komponente für Aktivitäten
- Liest aus globalem Lock-Context
- Zeigt "Übergeordnetes Lernpaket gesperrt"-Banner, wenn Parent gesperrt von anderem User
- Kinder erhalten `isEditMode` prop basierend auf Parent-Lock

**Datei:** `hooks/useActivityInheritedLock.js`

- Hook für Aktivitäten-Komponenten
- `isEditMode` basiert ausschließlich auf `isParentLockedByMe`
- `saveActivity()` prüft Parent-Lock vor Backend-Call

### 5. Neue Backend-Funktion: Lock-Validierung
**Datei:** `functions/validateLockSecure.js`

- Wird vom Heartbeat aufgerufen
- Prüft, ob ein Lock noch gültig ist (nicht abgelaufen, noch vorhanden)
- Rückgabe: `{ still_locked: boolean, locked_by_user, locked_at }`

---

## Test-Szenario: Tab 4 → Tab 3 → Exit

### Setup
1. **Tab 3 (Lernpakete):** Lernpaket P in der Struktur
2. **Tab 4 (Aktivitäten):** Aktivität A gehört zu Lernpaket P
3. **User:** 'test@example.com'

### Testschritte

#### Schritt 1: Aktivität in Tab 4 bearbeiten
```
1. Navigiere zu Tab 4
2. Wähle Aktivität A
3. Klicke "Bearbeitungsmodus aktivieren"
```

**Erwartet:**
- Frontend ruft `acquireLockSecure({ entityName: 'Lernpakete', entityId: P.id })`
- Backend speichert Lock auf Paket P mit `locked_by_user = 'test@example.com'`
- Frontend setzt `globalLock.setLocked(P.id, 'test@example.com')`
- Aktivität A zeigt Input-Felder an (isEditMode = true)
- Heartbeat startet (alle 15 Sekunden)

#### Schritt 2: Zu Tab 3 wechseln
```
4. Klicke auf Tab 3
5. Navigiere zu Lernpaket P
```

**Erwartet:**
- Tab 3 liest `globalLock.isLockedByMe(P.id, userEmail)` → **true**
- LernpaketPanel zeigt: "✎ Bearbeitungsmodus aktiv" Banner
- Phasen sind editierbar
- **Keine neuen Lock-Anfragen** (Lock ist bereits aktiv, wird geteilt)

#### Schritt 3: Bearbeitung in Tab 3 beenden
```
6. Klicke "Bearbeitungsmodus beenden"
```

**Erwartet:**
- Frontend ruft `releaseLockSecure({ entityName: 'Lernpakete', entityId: P.id })`
- Backend: Lock auf Paket P wird gelöscht
- Frontend: `globalLock.clearLock()` wird aufgerufen
- **globalLock.currentLockedLernpaketId = null**

#### Schritt 4: Zurück zu Tab 4
```
7. Klicke auf Tab 4
8. Navigiere zu Aktivität A
```

**Erwartet:**
- ActivityLockAwareWrapper liest `globalLock.isLockedByMe(P.id, userEmail)` → **false**
- Aktivität A zeigt Read-Only-Modus an
- Input-Felder sind deaktiviert
- **Die Aktivität ist sofort im Lesemodus**, ohne neue Backend-Abfrage

---

## Verifizierungspunkte

### ✅ Single Lock pro Lernpaket
- [ ] Nur ein Lock existiert auf Ebene des Lernpakets
- [ ] Aktivitäten haben KEINE eigenen Locks
- [ ] Backend (`updateActivitySecure`) prüft Parent-Lernpaket-Lock

### ✅ Globaler State Sharing
- [ ] `globalLock.currentLockedLernpaketId` wird von Tab 3 & Tab 4 gelesen
- [ ] Änderungen in einem Tab sind sofort in anderem sichtbar
- [ ] Keine lokalen State-Widersprüche zwischen Tabs

### ✅ Heartbeat & Cleanup
- [ ] Heartbeat läuft nur einmal pro Lernpaket
- [ ] Bei Heartbeat-Fehler: Lock wird sofort gelöscht
- [ ] Browser-Unload: Lock wird via Beacon freigegeben

### ✅ UI-Konsistenz nach Exit
- [ ] Tab 4: Nach Exit in Tab 3 ist Aktivität im Lesemodus
- [ ] Keine verwaisten Edit-States
- [ ] Keine Dateninkonsistenzen bei gleichzeitigem Tab-Wechsel

### ✅ Fremdsperre Handling
- [ ] Wenn Parent von anderem User gesperrt: Banner in Aktivität
- [ ] Text: "Das übergeordnete Lernpaket wird aktuell von [User] bearbeitet"
- [ ] Aktivität in Read-Only

---

## Migrations-Checklist (für Datenbankschema)

Falls später implementiert, können diese Felder aus `LernpaketPhaseAktivitaet` entfernt werden:
- [ ] `lock_status` (obsolet)
- [ ] `locked_by_user` (obsolet)
- [ ] `locked_at` (obsolet)
- [ ] `lock_version` (obsolet)

**Aktuell:** Diese Felder werden ignoriert, sind aber noch im Schema vorhanden (keine Datenlöschung).

---

## Code-Referenzen

### Lock acquieren (Tab 4 bei Aktivität)
```javascript
// In Aktivitäts-Komponente
const { acquireLock } = useLernpaketLockHierarchical(parentLernpaketId, userEmail);

// Beim Klick auf "Bearbeitungsmodus"
const success = await acquireLock();
if (success) {
  // globalLock.setLocked(parentLernpaketId, userEmail) wurde intern aufgerufen
  // Heartbeat läuft
}
```

### Lock freigeben (Tab 3)
```javascript
// In LernpaketPanel
const { releaseLock } = useLernpaketLockHierarchical(paketId, userEmail);

// Beim Klick auf "Bearbeitungsmodus beenden"
await releaseLock();
// globalLock.clearLock() wurde intern aufgerufen
```

### Aktivität in Tab 4 rendernen
```javascript
// In Tab 4 Komponente
<ActivityLockAwareWrapper
  lernpaketId={paket.id}
  userEmail={userEmail}
  canEdit={kannBearbeiten}
>
  {({ isEditMode, isParentLocked }) => (
    <ActivityDetailView
      isEditMode={isEditMode}
      // ...
    />
  )}
</ActivityLockAwareWrapper>
```

---

## Troubleshooting

### Problem: Aktivität bleibt nach Tab 3 Exit im Edit-Mode
**Ursache:** `useActivityInheritedLock` liest `globalLock.isLockedByMe()` mit veralteten Wert

**Lösung:** Stelle sicher, dass `useLernpaketLockGlobal()` Hook korrekt aufgerufen wird und die Context-Provider aktiv ist

### Problem: Heartbeat validiert nicht korrekt
**Ursache:** `validateLockSecure` kann Entity nicht finden oder `locked_at` ist nicht gesetzt

**Lösung:** Prüfe `acquireLockSecure`, dass `locked_at` mit aktuellem Timestamp gesetzt wird

### Problem: Two-Tab Lock-Konflikt
**Ursache:** `globalLock.currentLockedLernpaketId` ist nicht eindeutig oder wird nicht geteilt

**Lösung:** Stelle sicher, dass `LernpaketLockProvider` App-weit aktiv ist und nicht pro Tab neu erstellt wird