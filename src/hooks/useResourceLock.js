/**
 * useResourceLock.js
 *
 * Generischer pessimistic-locking Hook für beliebige Entitäten.
 *
 * Architektur (identisch mit useActivityLock):
 * - lock_status, locked_by_user, locked_at direkt in der Entity gespeichert
 * - Heartbeat alle 30s: erneuert locked_at → hält Lock am Leben
 * - Auto-Expire: locked_at > 2 Minuten → gilt als abgelaufen (UI-seitig)
 * - Cleanup bei unmount + beforeunload
 *
 * Voraussetzung: Die Entität muss die Felder lock_status, locked_by_user, locked_at besitzen.
 *
 * @param {string} entityName   - Name der base44-Entität (z.B. 'Aufgabenbausteine')
 * @param {string[]} queryKeys  - React Query Keys, die nach Lock-Ops invalidiert werden
 * @param {string|null} recordId   - ID des zu sperrenden Datensatzes
 * @param {string|null} userEmail  - E-Mail des aktuellen Nutzers
 * @param {boolean} active         - true = Lock halten (z.B. editMode), false = freigeben
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

export function useResourceLock(entityName, queryKeys, recordId, userEmail, active) {
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

  // ── Lock erwerben ─────────────────────────────────────────────────────────
  const acquireLock = useCallback(async () => {
    if (!recordId || !userEmail || !entity) return false;

    const records = await entity.filter({ id: recordId });
    const record = records[0];
    if (!record) return false;

    // Bereits von anderem aktiven User gesperrt?
    if (record.lock_status && record.locked_by_user !== userEmail && !isLockExpired(record.locked_at)) {
      return false;
    }

    await entity.update(recordId, {
      lock_status: true,
      locked_by_user: userEmail,
      locked_at: new Date().toISOString(),
    });

    heldRef.current = true;
    invalidate();
    return true;
  }, [recordId, userEmail, entity, invalidate]);

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
  const forceReleaseLock = useCallback(async () => {
    if (!recordId || !entity) return;
    await entity.update(recordId, {
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
      }
    }, HEARTBEAT_MS);
  }, [recordId, entity]);

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
  }, [active, recordId]);

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