/**
 * useCollaborationLock.js
 *
 * ✅ Robuster Collaboration-Lock mit:
 * - Atomarer Backend-Akquisition (acquireLockSecure)
 * - Heartbeat-Fehlerbehandlung mit Retry-Logic
 * - Offline-Erkennung & Fallback
 * - Zuverlässiger Cleanup bei Unmount/Unload
 * - Retry-Counter für UI-Feedback
 *
 * VERWENDUNG:
 * const {
 *   acquireLock,
 *   releaseLock,
 *   isLocked,
 *   retryCount,
 *   isOffline,
 *   lockLost
 * } = useCollaborationLock(
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lockLost, setLockLost] = useState(false);
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

  // ── Lock über Backend-Funktion erwerben (ATOMAR mit Retry) ──
  const acquireLock = useCallback(async () => {
    if (!recordId || !userEmail) return false;

    const maxRetries = 3;
    const retryDelayMs = 300;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
          console.info(`[useCollaborationLock] Lock acquired for ${recordId} (attempt ${attempt}/${maxRetries})`);
          return true;
        }

        // Bei Race Condition: Retry, sonst abbrechen
        const code = response.data?.code;
        if (code === 'RACE_CONDITION_DETECTED' && attempt < maxRetries) {
          console.warn(`[useCollaborationLock] Race condition detected. Retrying... (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
          continue;
        }

        // Lock-Akquisition endgültig fehlgeschlagen (andere Lock-Gründe)
        const lockedByOther = response.data?.lockedBy ?? response.data?.winner;
        if (onLockDenied) {
          onLockDenied(lockedByOther);
        }
        console.warn(
          `[useCollaborationLock] Lock acquisition failed (code: ${code}). Winner: ${lockedByOther}`
        );
        return false;
      } catch (error) {
        if (attempt < maxRetries) {
          console.warn(`[useCollaborationLock] Lock attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        } else {
          console.error('[useCollaborationLock] acquireLock failed after all retries:', error);
          return false;
        }
      }
    }

    return false;
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
      if (!heldRef.current || !recordId || isOffline) return;

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

        // Nach max Retries → Lock als verloren markieren
        if (heartbeatRetryRef.current >= HEARTBEAT_RETRY_LIMIT) {
          console.error(
            '[useCollaborationLock] Heartbeat max retries exceeded. Lock lost.'
          );
          heldRef.current = false;
          setIsLocked(false);
          setLockLost(true);
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        // Frühwarnung ab Versuch 2
        if (heartbeatRetryRef.current === HEARTBEAT_RETRY_LIMIT - 1) {
          console.warn('[useCollaborationLock] Heartbeat warning: 1 retry left before lock loss');
        }
      }
    };

    heartbeatRef.current = setInterval(performHeartbeat, HEARTBEAT_MS);
    console.info('[useCollaborationLock] Heartbeat started');
  }, [recordId, entityName, invalidate, isOffline]);

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

  // ── Offline/Online Erkennung ──
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      console.info('[useCollaborationLock] Offline mode detected');
    };

    const handleOnline = async () => {
      setIsOffline(false);
      setRetryCount(0);
      setLockLost(false);
      heartbeatRetryRef.current = 0;
      console.info('[useCollaborationLock] Online mode restored. Attempting lock revalidation...');

      // Versuche Lock zu revalidieren wenn gerade aktiv
      if (heldRef.current && recordId) {
        try {
          const entity = base44.entities[entityName];
          const records = await entity.filter({ id: recordId });
          const current = records[0];

          if (current && current.locked_by_user === userEmailRef.current) {
            // Lock ist immer noch gültig
            console.info('[useCollaborationLock] Lock revalidated after reconnect');
            // Heartbeat wird automatisch weitermachen
          } else {
            // Lock wurde verloren
            heldRef.current = false;
            setIsLocked(false);
            setLockLost(true);
            console.warn('[useCollaborationLock] Lock lost during offline period');
          }
        } catch (e) {
          console.warn('[useCollaborationLock] Revalidation failed:', e.message);
        }
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [recordId, entityName]);

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
    retryCount,
    isOffline,
    lockLost, // ← true wenn Lock nach 3 Retries verloren
  };
}