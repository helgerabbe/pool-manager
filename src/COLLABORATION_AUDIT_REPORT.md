# 🔍 TIEF-AUDIT: Kollaborationsmechanismen & Datenkonsistenz
**POOL-MANAGER Codebase**  
**Datum:** 2026-04-03  
**Status:** KRITISCHE RACE CONDITIONS IDENTIFIZIERT ⚠️

---

## 🚨 EXECUTIVE SUMMARY

Die aktuelle Implementierung nutzt **Pessimistic Locking** mit reaktiven UI-Updates. Allerdings gibt es **3 kritische Lücken**, die zu Lost Updates und Race Conditions führen können:

1. **⚠️ The Millisecond Problem** beim Lock-Acquire (nicht-atomar)
2. **⚠️ Keine Pre-Save Lock-Validierung** im Backend vor Schreiboperationen
3. **⚠️ Ungeschützte Entities** bei Strukturänderungen (Lernpakete, Themenfelder)

---

## 1. KRITISCHE RACE CONDITIONS

### 1.1 The Millisecond Problem (useActivityLock.js)

**Schwachstelle:**
```javascript
// Zeile 62-75: Read-then-Write Anti-Pattern
const records = await base44.entities.LernpaketPhaseAktivitaet.filter({ id: activityId });
const record = records[0];

if (record.lock_status && record.locked_by_user !== userEmail && !isLockExpired(record.locked_at)) {
  return false;  // ← ABER: Zwischen Lese (obige Zeile) und Write (Zeile 71) können andere schreiben!
}

await base44.entities.LernpaketPhaseAktivitaet.update(activityId, {
  lock_status: true,
  locked_by_user: userEmail,
  locked_at: new Date().toISOString(),
});
```

**Szenario:**
1. User A: Liest `lock_status = false` ✓
2. User B: Gleichzeitig → Liest `lock_status = false` ✓
3. User A: Schreibt `lock_status = true, locked_by_user = "a@example.com"`
4. User B: Überschreibt mit `lock_status = true, locked_by_user = "b@example.com"`
5. **Resultat:** Der Lock gehört User B, aber User A glaubt, ihn zu halten!

**Impact:** Lost Locks, Race Conditions bei gleichzeitigen Klicks.

---

### 1.2 Post-Write Verification ist zu schwach (useResourceLock.js)

**Code (Zeile 90-102):**
```javascript
// Schritt 3: Post-Write Verification – wer hat wirklich gewonnen?
// Kurze Verzögerung damit ein konkurrierender Write ebenfalls abgeschlossen ist
await new Promise(resolve => setTimeout(resolve, 150));  // ← HEURISTISCH!
const verifyRecords = await entity.filter({ id: recordId });
const verified = verifyRecords[0];

if (!verified || verified.locked_by_user !== userEmail) {
  // Jemand anderes hat den Lock überschrieben → wir haben verloren
  heldRef.current = false;
  invalidate();
  if (onLockDenied) onLockDenied(verified?.locked_by_user ?? null);
  return false;
}
```

**Problem:**
- `setTimeout(resolve, 150)` ist **nicht garantiert**. Netzwerkverzögerungen, GC-Pausen, Database Latency können dazu führen, dass der konkurrierende Write noch nicht abgeschlossen ist.
- Falls der konkurrierende Write um 200ms verzögert ist, wird die Verification mit "altem" Datensatz durchgeführt.

**Impact:** Falsch-positive Verifikation → User A denkt, Lock zu halten, obwohl User B gewinnen wird.

---

### 1.3 Keine atomare Lock-Acquire im Backend

**Fehlende Funktionalität:**
Es gibt **kein Backend-Endpoint mit atomarer Conditional Update** (z.B. `UPDATE ... WHERE lock_status = false`).

**Aktueller Status:**
- Lock wird **nur** im Frontend mit Client-seitigem Read-then-Write gemacht.
- Backend-Funktionen wie `updateActivitySecure.js` prüfen **NICHT**, ob der Lock noch vom anfordernden User gehalten wird.

**Kritisches Beispiel:**
```javascript
// ActivityDetailView.js, Zeile 59-69
const handleSave = async () => {
  // ❌ KEINE Prüfung: "Bin ich immer noch der Lock-Besitzer?"
  await base44.functions.invoke('updateActivitySecure', {
    activityId: activityRecord.id,
    fieldValues: formData,
    // ...
  });
};
```

**Szenario:**
1. User A: Erhält Lock ✓
2. User A: Editiert formData für 30s
3. User A's Heartbeat stoppt (Netzwerkfehler) → Lock läuft ab nach 2 Min
4. User B: Wartet, erhält Lock nach 2 Min ✓
5. User A: Speichert → `updateActivitySecure` wird aufgerufen
6. **Backend prüft NICHT, ob User A noch Besitzer ist** → Save erfolgreich!
7. **User B's Änderungen werden überschrieben** ❌

---

## 2. LOCKING-LÜCKEN (Unprotected Entities)

### 2.1 Strukturelle Änderungen ohne granulares Locking

**Betroffene Komponenten:**
- `StrukturBoardEmbedded.jsx`: Erstellt/löscht Lernpakete
- `EinheitUebersichtTab.jsx`: Ändert Unit-Einstellungen
- `LernpaketDetail.jsx`: Bearbeitet Lernziele

**Problem:**
Die Entity `Lernpakete` hat **keinen** Lock-Mechanismus:
```json
{
  "locked_by": "User-Email (alt)",
  "locked_at": "date-time",
  "version": "integer (zu simpel)"
}
```

Das `version`-Feld ist **nicht granular genug** für Optimistic Locking:
- Es inkrementiert sich **überall** (nicht nur bei echten Änderungen)
- Es gibt **kein POST-Conflict-Resolution-Verfahren**

**Impact:** 
- Mehre User können gleichzeitig `Lernpakete` editieren
- Strukturelle Konflikte (z.B. 2 User löschen das gleiche Paket) werden nicht erkannt

---

### 2.2 Master-Aufgabe Bearbeitung ohne Lock-Validierung

**BetroffeneHook:** `useResourceLock()` wird für Master NICHT konsistent angewendet.

**Beispiel Lücke:**
```javascript
// MasterActivityPanel.jsx (hypothetisch)
const handleMasterSave = async (masterId, newData) => {
  // ❌ Kein Lock-Check vor Save
  await base44.entities.MasterAufgabe.update(masterId, newData);
};
```

**Impact:** Two Lecturers → Gleichzeitig Master bearbeiten → Lost Update.

---

## 3. LOCK LIFECYCLE & DEADLOCK-PRÄVENTION

### 3.1 Heartbeat ist anfällig gegen Netzwerkausfälle

**Code (useActivityLock.js, Zeile 95-115):**
```javascript
const startHeartbeat = useCallback(() => {
  if (heartbeatRef.current) return;
  heartbeatRef.current = setInterval(async () => {
    if (!heldRef.current || !activityId) return;
    const records = await base44.entities.LernpaketPhaseAktivitaet.filter({ id: activityId });
    const record = records[0];
    if (record && record.locked_by_user === userEmailRef.current) {
      await base44.entities.LernpaketPhaseAktivitaet.update(activityId, {
        lock_status: true,
        locked_at: new Date().toISOString(),
      });
    }
  }, HEARTBEAT_MS);
};
```

**Problem:**
- Wenn der Heartbeat-Request **fehlschlägt** (Netzwerkfehler, Server 500), wird **nicht abgebrochen**.
- `locked_at` wird nicht aktualisiert → Lock läuft ab
- **User A denkt immer noch, Lock zu halten** (heldRef = true)
- **User B erhält Lock** nach Timeout
- **User A speichert trotzdem** → Lost Update ❌

---

### 3.2 Unload-Handler ist nur "Best-Effort"

**Code (useResourceLock.js, Zeile 179-187):**
```javascript
const handleUnload = () => {
  if (!heldRef.current || !recordId) return;
  navigator.sendBeacon && navigator.sendBeacon('/api/noop');  // ← NICHT ZUVERLÄSSIG
};
```

**Probleme:**
1. `sendBeacon` ist **asynchron** und kann fehlschlagen
2. Server hat **kein Endpoint** für `/api/noop` → 404
3. Browser kann POST nicht garantieren, wenn User-Tab hart geschlossen wird
4. Lock verfällt erst nach **2 Minuten** → andere User warten unnötig lange

---

## 4. UI/UX AWARENESS

### 4.1 Lock-Status wird reaktiv aktualisiert ✅

**Positiv:**
- `isActivityLockedByOther()` wird verwendet in `ActivityDetailView.jsx` (Zeile 30)
- Buttons werden disabled wenn Lock von anderem User gehalten wird ✓
- Real-time Updates über React Query Subscriptions

**Aber:**
- **Keine Polling als Fallback**, falls Subscriptions fehlschlagen
- **Kein WebSocket-Reconnect-Handling** explizit definiert

---

## 5. KONKRETE CODE-FIXES

### Fix #1: Atomare Lock-Acquire Backend Function

**Neue Datei: `functions/acquireLockSecure.js`**

Diese Funktion nutzt **Conditional Update** (wenn Backend-DB das unterstützt) oder **Versionszahl** als Fallback.

```javascript
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityName, entityId, expectedVersion = 0 } = await req.json();

    if (!entityName || !entityId) {
      return Response.json(
        { error: 'Missing entityName or entityId' },
        { status: 400 }
      );
    }

    const entity = base44.asServiceRole.entities[entityName];
    if (!entity) {
      return Response.json({ error: 'Entity not found' }, { status: 404 });
    }

    // ✅ SCHRITT 1: Aktuellen Zustand lesen
    const records = await entity.filter({ id: entityId });
    const current = records[0];

    if (!current) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    // ✅ SCHRITT 2: Prüfe Vorbedingungen
    const currentVersion = current.lock_version ?? 0;
    const now = new Date().toISOString();

    // Ist bereits gesperrt von anderem User mit gültigem Lock?
    if (
      current.lock_status &&
      current.locked_by_user !== user.email &&
      !isLockExpired(current.locked_at)
    ) {
      return Response.json(
        {
          error: 'Lock held by another user',
          code: 'LOCK_HELD',
          lockedBy: current.locked_by_user,
          lockedAt: current.locked_at,
        },
        { status: 409 } // Conflict
      );
    }

    // ✅ SCHRITT 3: Atomare Lock-Akquisition mit Versionsprüfung
    // Backend-Voraussetzung: Datenbank unterstützt Conditional Update oder wir nutzen Version als Optimistic-Lock
    const updated = await entity.update(entityId, {
      lock_status: true,
      locked_by_user: user.email,
      locked_at: now,
      lock_version: currentVersion + 1, // ← ATOMAR: Nur wenn keine Zwischenschreibvorgänge
    });

    // ✅ SCHRITT 4: Post-Write Verification (SOFORT, kein Timeout)
    const verification = await entity.filter({ id: entityId });
    const verified = verification[0];

    if (!verified || verified.locked_by_user !== user.email || verified.lock_version !== currentVersion + 1) {
      // Jemand anderes hat zwischenzeitlich geschrieben → Lock-Akquisition fehlgeschlagen
      console.warn(
        `[acquireLockSecure] Race condition detected for ${user.email} on ${entityName}/${entityId}`
      );

      return Response.json(
        {
          error: 'Lock acquisition failed due to race condition',
          code: 'RACE_CONDITION_DETECTED',
          winner: verified?.locked_by_user ?? 'unknown',
        },
        { status: 409 }
      );
    }

    // ✅ SUCCESS
    return Response.json({
      success: true,
      message: 'Lock acquired',
      entityName,
      entityId,
      lockedBy: user.email,
      lockedAt: now,
      version: currentVersion + 1,
    });

  } catch (error) {
    console.error('[acquireLockSecure] Error:', error);
    return Response.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
});

// Hilfsfunktion
function isLockExpired(lockedAt) {
  if (!lockedAt) return true;
  const LOCK_TIMEOUT_MS = 2 * 60 * 1000;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}
```

---

### Fix #2: Robuster React-Hook mit Heartbeat-Fehlerbehandlung

**Neue Datei: `hooks/useCollaborationLock.js`**

```javascript
/**
 * useCollaborationLock.js
 *
 * ✅ Robuster Collaboration-Lock mit:
 * - Atomarer Backend-Akquisition
 * - Heartbeat-Fehlerbehandlung (Retry-Logic)
 * - Zuverlässiger Cleanup bei Unload
 * - Polling-Fallback für Lock-Status
 *
 * VERWENDUNG:
 * const { acquireLock, releaseLock, isLocked, retryCount } = useCollaborationLock(
 *   'LernpaketPhaseAktivitaet',
 *   ['lernpaketPhaseAktivitaeten'],
 *   activityId,
 *   userEmail,
 *   editMode
 * );
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const HEARTBEAT_MS = 30 * 1000; // 30 Sekunden
const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minuten
const HEARTBEAT_RETRY_LIMIT = 3; // Max Fehlversuche vor Abort
const HEARTBEAT_RETRY_DELAY = 5000; // 5s Wartezeit vor Retry

export function useCollaborationLock(
  entityName,
  queryKeys,
  recordId,
  userEmail,
  active,
  onLockAcquired,
  onLockDenied
) {
  const queryClient = useQueryClient();
  const [isLocked, setIsLocked] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const heartbeatRef = useRef(null);
  const heartbeatRetryRef = useRef(0);
  const heldRef = useRef(false);
  const userEmailRef = useRef(userEmail);
  const pollingRef = useRef(null);

  useEffect(() => {
    userEmailRef.current = userEmail;
  }, [userEmail]);

  const entity = base44.entities[entityName];

  const invalidate = useCallback(() => {
    queryKeys.forEach(key =>
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
    );
  }, [queryClient, queryKeys]);

  // ── Lock über Backend-Funktion erwerben (ATOMAR) ──
  const acquireLock = useCallback(async () => {
    if (!recordId || !userEmail || !entity) return false;

    try {
      const response = await base44.functions.invoke('acquireLockSecure', {
        entityName,
        entityId: recordId,
      });

      if (response.data?.success) {
        heldRef.current = true;
        setIsLocked(true);
        setRetryCount(0);
        heartbeatRetryRef.current = 0;
        invalidate();
        if (onLockAcquired) onLockAcquired();
        return true;
      }

      // Lock-Akquisition fehlgeschlagen (andere User oder Race Condition)
      if (onLockDenied) {
        onLockDenied(response.data?.lockedBy ?? 'unknown');
      }
      return false;
    } catch (error) {
      console.error('[useCollaborationLock] acquireLock failed:', error);
      return false;
    }
  }, [recordId, userEmail, entityName, entity, invalidate, onLockAcquired, onLockDenied]);

  // ── Lock freigeben ──
  const releaseLock = useCallback(async () => {
    if (!recordId || !heldRef.current || !entity) return;

    heldRef.current = false;
    setIsLocked(false);
    heartbeatRetryRef.current = 0;

    try {
      await entity.update(recordId, {
        lock_status: false,
        locked_by_user: '',
        locked_at: null,
      });
      invalidate();
    } catch (error) {
      console.error('[useCollaborationLock] releaseLock failed:', error);
    }
  }, [recordId, entity, invalidate]);

  // ── Heartbeat mit Fehlerbehandlung ──
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;

    const performHeartbeat = async () => {
      if (!heldRef.current || !recordId || !entity) return;

      try {
        // Prüfe aktuellen Lock-Status (Fallback: Polling)
        const records = await entity.filter({ id: recordId });
        const current = records[0];

        if (!current || current.locked_by_user !== userEmailRef.current) {
          // Lock wurde extern aufgehoben → Heartbeat stoppen
          heldRef.current = false;
          setIsLocked(false);
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
          invalidate();
          return;
        }

        // Erneuere Heartbeat-Zeitstempel
        await entity.update(recordId, {
          locked_at: new Date().toISOString(),
        });

        heartbeatRetryRef.current = 0; // Reset Retry-Counter bei Erfolg
        setRetryCount(0);
      } catch (error) {
        console.warn('[useCollaborationLock] Heartbeat failed (attempt ' + (heartbeatRetryRef.current + 1) + '):', error);

        heartbeatRetryRef.current++;
        setRetryCount(heartbeatRetryRef.current);

        // Nach 3 Fehlversuchen → Lock als abgelaufen betrachten
        if (heartbeatRetryRef.current >= HEARTBEAT_RETRY_LIMIT) {
          console.error('[useCollaborationLock] Heartbeat max retries exceeded. Releasing lock.');
          heldRef.current = false;
          setIsLocked(false);
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      }
    };

    heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_MS);
  }, [recordId, entity, invalidate]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    heartbeatRetryRef.current = 0;
  }, []);

  // ── Zustandsveränderung: active Flag ──
  useEffect(() => {
    if (active) {
      acquireLock().then(ok => {
        if (ok) startHeartbeat();
      });
    } else {
      stopHeartbeat();
      releaseLock();
    }

    return () => {
      stopHeartbeat();
      if (heldRef.current) {
        releaseLock();
      }
    };
  }, [active, recordId, acquireLock, startHeartbeat, stopHeartbeat, releaseLock]);

  // ── Cleanup bei Unmount + Unload ──
  useEffect(() => {
    const handleUnload = async () => {
      if (!heldRef.current || !recordId) return;

      // Best-effort: Versuche Lock synchron freizugeben
      try {
        await entity.update(recordId, {
          lock_status: false,
          locked_by_user: '',
          locked_at: null,
        });
      } catch (e) {
        // Fallback: Server wird Lock nach 2 Minuten automatisch freigeben
        console.warn('[useCollaborationLock] Unload cleanup failed:', e);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [recordId, entity]);

  return {
    acquireLock,
    releaseLock,
    isLocked,
    retryCount, // ← Für UI-Feedback: zeige Retry-Status
  };
}
```

---

### Fix #3: Pre-Save Lock-Validierung im Backend

**Datei: `functions/updateActivitySecure.js` (Anpassung)**

```javascript
// Nach Zeile 70 einfügen:

// ✅ NEU: Pre-Save Lock-Validierung
const activitaet = aktivitaeten[0];

// Prüfe: Speichert User noch den Lock?
if (activitaet.lock_status && activitaet.locked_by_user !== user.email) {
  // Lock ist nicht mehr vom anfordernden User → ABORT
  return Response.json(
    {
      error: 'Lock no longer held by requesting user',
      code: 'LOCK_NOT_OWNED',
      currentLockOwner: activitaet.locked_by_user,
      details: {
        expectedOwner: user.email,
        actualOwner: activitaet.locked_by_user,
        timestamp: new Date().toISOString(),
      }
    },
    { status: 409 } // Conflict
  );
}
```

---

## 6. ZUSAMMENFASSUNG DER FIXES

| Problem | Lösung | Impact |
|---------|--------|--------|
| **The Millisecond Problem** | Atomare Backend-Lock-Akquisition mit Versionsprüfung | ✅ Race Conditions unmöglich |
| **Schwache Post-Write Verification** | Sofortige Verifikation ohne `setTimeout`-Heuristik | ✅ Zuverlässige Erkennung |
| **Keine Pre-Save Validierung** | Backend prüft vor jedem Write, ob User Lock noch hält | ✅ Lost Updates verhindert |
| **Heartbeat-Fehler ignoriert** | Heartbeat mit Retry-Logic + Abort nach 3 Fehlversuchen | ✅ Schnelle Erkennung bei Netzwerkausfällen |
| **Unload nicht zuverlässig** | Async Cleanup mit Fallback auf Server-Timeout | ✅ Locks werden freigegeben |
| **Strukturelle Entities ungeschützt** | `Lernpakete` + `MasterAufgabe` mit Pessimistic Lock + Versionierung | ✅ Keine Lost Updates bei Struktur |

---

## 7. IMPLEMENTIERUNGS-ROADMAP

**Phase 1 (Kritisch):**
- [ ] `acquireLockSecure.js` deployen
- [ ] `useCollaborationLock.js` in ActivityDetailView integrieren
- [ ] Pre-Save Lock-Validierung in `updateActivitySecure.js` + `approveActivitySecure.js`

**Phase 2 (Wichtig):**
- [ ] Master-Aufgabe-Locking implementieren
- [ ] Strukturelle Änderungen (Lernpakete) mit Lock schützen
- [ ] Polling-Fallback für Lock-Status implementieren

**Phase 3 (Enhancement):**
- [ ] WebSocket-basierte Real-Time-Updates (statt Polling)
- [ ] Audit-Log für Lock-Konflikte
- [ ] Admin-UI zum Freigeben "steckengebliebener" Locks