/**
 * useCollaborationLock.js
 *
 * ✅ Robuster Collaboration-Lock mit:
 * - Atomarer Backend-Akquisition (acquireLockSecure)
 * - Heartbeat-Fehlerbehandlung mit Retry-Logic
 * - Zuverlässiger Cleanup bei Unmount/Unload
 * - Polling-Fallback für Lock-Status
 * - Retry-Counter für UI-Feedback
 *
 * VERWENDUNG:
 * const { acquireLock, releaseLock, isLocked, retryCount } = useCollaborationLock(
 *   'LernpaketPhaseAktivitaet',
 *   ['lernpaketPhaseAktivitaeten'],
 *   activityId,
 *   userEmail,
 *   editMode,
 *   onLockAcquired,      // Optional
 *   onLockDenied         // Optional
 * );
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const HEARTBEAT_MS = 30 * 1000; // 30 Sekunden
const HEARTBEAT_RETRY_LIMIT = 3; // Max Fehlversuche vor Abort

export function useCollaborationLock(
  entityName,
  queryKeys = [],
  recordId,
  userEmail,
  active = false,
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

  useEffect(() => {
    userEmailRef.current = userEmail;
  }, [userEmail]);

  const invalidate = useCallback(() => {
    queryKeys.forEach(key =>
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
    );
  }, [queryClient, queryKeys]);

  // ── Lock über Backend-Funktion erwerben (ATOMAR) ──
  const acquireLock = useCallback(async () => {
    if (!recordId || !userEmail) return false;

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
        console.info(`[useCollaborationLock] Lock acquired for ${recordId}`);
        return true;
      }

      // Lock-Akquisition fehlgeschlagen
      const lockedByOther = response.data?.lockedBy ?? response.data?.winner;
      if (onLockDenied) {
        onLockDenied(lockedByOther);
      }
      console.warn(
        `[useCollaborationLock] Lock acquisition failed. Winner: ${lockedByOther}`
      );
      return false;
    } catch (error) {
      console.error('[useCollaborationLock] acquireLock error:', error);
      return false;
    }
  }, [recordId, userEmail, entityName, invalidate, onLockAcquired, onLockDenied]);

  // ── Lock freigeben ──
  const releaseLock = useCallback(async () => {
    if (!recordId || !heldRef.current) return;

    heldRef.current = false;
    setIsLocked(false);
    heartbeatRetryRef.current = 0;

    try {
      const entity = base44.entities[entityName];
      await entity.update(recordId, {
        lock_status: false,
        locked_by_user: '',
        locked_at: null,
      });
      invalidate();
      console.info(`[useCollaborationLock] Lock released for ${recordId}`);
    } catch (error) {
      console.error('[useCollaborationLock] releaseLock error:', error);
    }
  }, [recordId, entityName, invalidate]);

  // ── Heartbeat mit Fehlerbehandlung ──
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;

    const performHeartbeat = async () => {
      if (!heldRef.current || !recordId) return;

      try {
        const entity = base44.entities[entityName];
        const records = await entity.filter({ id: recordId });
        const current = records[0];

        if (!current || current.locked_by_user !== userEmailRef.current) {
          // Lock wurde extern aufgehoben
          heldRef.current = false;
          setIsLocked(false);
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
          invalidate();
          console.warn('[useCollaborationLock] External lock release detected');
          return;
        }

        // Erneuere Heartbeat-Zeitstempel
        await entity.update(recordId, {
          locked_at: new Date().toISOString(),
        });

        heartbeatRetryRef.current = 0;
        setRetryCount(0);
      } catch (error) {
        heartbeatRetryRef.current++;
        setRetryCount(heartbeatRetryRef.current);

        console.warn(
          `[useCollaborationLock] Heartbeat failed (attempt ${heartbeatRetryRef.current}/${HEARTBEAT_RETRY_LIMIT}):`,
          error.message
        );

        // Nach max Retries → Lock als abgelaufen betrachten
        if (heartbeatRetryRef.current >= HEARTBEAT_RETRY_LIMIT) {
          console.error(
            '[useCollaborationLock] Heartbeat max retries exceeded. Releasing lock.'
          );
          heldRef.current = false;
          setIsLocked(false);
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      }
    };

    heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_MS);
    console.info('[useCollaborationLock] Heartbeat started');
  }, [recordId, entityName, invalidate]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
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

      try {
        const entity = base44.entities[entityName];
        await entity.update(recordId, {
          lock_status: false,
          locked_by_user: '',
          locked_at: null,
        });
        console.info('[useCollaborationLock] Unload cleanup successful');
      } catch (e) {
        console.warn('[useCollaborationLock] Unload cleanup failed (server will timeout):', e.message);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [recordId, entityName]);

  return {
    acquireLock,
    releaseLock,
    isLocked,
    retryCount, // ← Für UI: zeige Verbindungsprobleme an
  };
}