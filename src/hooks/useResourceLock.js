/**
 * useResourceLock.js
 *
 * Generischer pessimistic-locking Hook mit Optimistic Locking zur
 * Behebung der Race-Condition beim gleichzeitigen Lock-Acquire.
 *
 * Race-Condition-Lösung (Optimistic Locking):
 *   - Beim Acquire: lies aktuellen Datensatz inkl. lock_version
 *   - Schreibe Lock + lock_version + 1
 *   - Lese sofort nach dem Write nochmals (Post-Write Verification)
 *   - Falls locked_by_user !== userEmail → jemand anderes war schneller → Lock abweisen
 *   - Das Zeitfenster der Race-Condition ist dadurch auf wenige Millisekunden reduziert
 *     und der "Verlierer" wird zuverlässig erkannt
 *
 * Voraussetzung: Entität benötigt die Felder:
 *   lock_status, locked_by_user, locked_at, lock_version
 *
 * @param {string}   entityName  - Name der base44-Entität (z.B. 'Aufgabenbausteine')
 * @param {string[]} queryKeys   - React Query Keys, die nach Lock-Ops invalidiert werden
 * @param {string|null} recordId    - ID des zu sperrenden Datensatzes
 * @param {string|null} userEmail   - E-Mail des aktuellen Nutzers
 * @param {boolean}     active      - true = Lock halten (editMode), false = freigeben
 * @param {function}    [onLockDenied] - Callback wenn Lock abgewiesen wurde (Race-Condition)
 */

import { useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minuten
const HEARTBEAT_MS   = 30 * 1000;      // 30 Sekunden

// ── Hilfsfunktionen (exportiert für UI-Nutzung) ───────────────────────────────

/** Gibt true zurück wenn der Lock abgelaufen ist. */
export function isLockExpired(lockedAt) {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}

/** Gibt true zurück wenn jemand anderes den Lock aktiv hält. */
export function isLockedByOther(record, myEmail) {
  if (!record?.lock_status) return false;
  if (record.locked_by_user === myEmail) return false;
  if (isLockExpired(record.locked_at)) return false;
  return true;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useResourceLock(entityName, queryKeys, recordId, userEmail, active, onLockDenied) {
  const queryClient = useQueryClient();
  const heartbeatRef = useRef(null);
  const heldRef = useRef(false);
  const userEmailRef = useRef(userEmail);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  const entity = base44.entities[entityName];

  const invalidate = useCallback(() => {
    queryKeys.forEach(key =>
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
    );
  }, [queryClient, queryKeys]);

  // ── Lock erwerben (mit Optimistic Locking) ────────────────────────────────
  const acquireLock = useCallback(async () => {
    if (!recordId || !userEmail || !entity) return false;

    // Schritt 1: Aktuellen Zustand lesen
    const records = await entity.filter({ id: recordId });
    const record = records[0];
    if (!record) return false;

    // Bereits von anderem aktiven User gesperrt?
    if (record.lock_status && record.locked_by_user !== userEmail && !isLockExpired(record.locked_at)) {
      return false;
    }

    const currentVersion = record.lock_version ?? 0;

    // Schritt 2: Lock setzen mit inkrementierter Version
    await entity.update(recordId, {
      lock_status: true,
      locked_by_user: userEmail,
      locked_at: new Date().toISOString(),
      lock_version: currentVersion + 1,
    });

    // Schritt 3: Post-Write Verification – wer hat wirklich gewonnen?
    // Kurze Verzögerung damit ein konkurrierender Write ebenfalls abgeschlossen ist
    await new Promise(resolve => setTimeout(resolve, 150));
    const verifyRecords = await entity.filter({ id: recordId });
    const verified = verifyRecords[0];

    if (!verified || verified.locked_by_user !== userEmail) {
      // Jemand anderes hat den Lock überschrieben → wir haben verloren
      heldRef.current = false;
      invalidate();
      if (onLockDenied) onLockDenied(verified?.locked_by_user ?? null);
      return false;
    }

    heldRef.current = true;
    invalidate();
    return true;
  }, [recordId, userEmail, entity, invalidate, onLockDenied]);

  // ── Lock freigeben ────────────────────────────────────────────────────────
  const releaseLock = useCallback(async () => {
    if (!recordId || !heldRef.current || !entity) return;

    heldRef.current = false;
    await entity.update(recordId, {
      lock_status: false,
      locked_by_user: '',
      locked_at: null,
    });
    invalidate();
  }, [recordId, entity, invalidate]);

  // ── Admin Force-Release ───────────────────────────────────────────────────
  const forceReleaseLock = useCallback(async (targetId) => {
    const id = targetId ?? recordId;
    if (!id || !entity) return;
    await entity.update(id, {
      lock_status: false,
      locked_by_user: '',
      locked_at: null,
    });
    invalidate();
  }, [recordId, entity, invalidate]);

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(async () => {
      if (!heldRef.current || !recordId || !entity) return;
      const records = await entity.filter({ id: recordId });
      const record = records[0];
      if (record && record.locked_by_user === userEmailRef.current) {
        // Lock gehört noch uns → erneuern
        await entity.update(recordId, {
          lock_status: true,
          locked_at: new Date().toISOString(),
        });
      } else {
        // Lock extern aufgehoben → stoppen
        heldRef.current = false;
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
        invalidate();
      }
    }, HEARTBEAT_MS);
  }, [recordId, entity, invalidate]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Reaktion auf active-Flag ──────────────────────────────────────────────
  useEffect(() => {
    if (active) {
      acquireLock().then(ok => { if (ok) startHeartbeat(); });
    } else {
      stopHeartbeat();
      releaseLock();
    }
    return () => {
      stopHeartbeat();
      if (heldRef.current) releaseLock();
    };
  }, [active, recordId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page-Unload Fallback ──────────────────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      if (!heldRef.current || !recordId) return;
      // Best-effort: primäre Absicherung ist der 2-Min-Timeout
      navigator.sendBeacon && navigator.sendBeacon('/api/noop');
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [recordId]);

  return { acquireLock, releaseLock, forceReleaseLock };
}