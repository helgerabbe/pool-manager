import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const HEARTBEAT_INTERVAL = 30 * 1000; // alle 30 Sekunden

/**
 * Hook zum Verwalten des Lernpaket-Locks mit acquireLockSecure.
 */
export function useLernpaketLock(paketId, userEmail, onLockLost) {
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState(null);
  const queryClient = useQueryClient();
  const heartbeatRef = useRef(null);
  const onLockLostRef = useRef(onLockLost);
  onLockLostRef.current = onLockLost;

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(async () => {
      try {
        // Prüfe ob Lock noch aktiv ist via Query Invalidation
        await queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      } catch (e) {
        // Fehler ignorieren
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat, queryClient]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  const acquireLock = useCallback(async () => {
    setIsLocking(true);
    setLockError(null);
    try {
      const res = await base44.functions.invoke('acquireLockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId,
      });
      console.log('[useLernpaketLock] acquireLockSecure response:', res?.data);
      
      if (res?.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
        startHeartbeat();
        return { success: true };
      } else {
        setLockError(res?.data?.message || 'Lock konnte nicht erworben werden.');
        return { success: false, locked_by: res?.data?.lockedBy };
      }
    } catch (e) {
      console.error('[useLernpaketLock] acquireLockSecure error:', e);
      const status = e?.response?.status;
      const data = e?.response?.data;
      
      if (status === 423) {
        // Structural Lock aktiv
        const msg = data?.message || 'Die Struktur wird gerade angepasst.';
        setLockError(msg);
        return { success: false, structural_lock: true, message: msg };
      } else if (status === 409) {
        // Lock von jemand anderem
        setLockError(data?.message || `Wird gerade von ${data?.lockedBy} bearbeitet.`);
        return { success: false, locked_by: data?.lockedBy };
      }
      
      setLockError('Fehler beim Sperren.');
      return { success: false };
    } finally {
      setIsLocking(false);
    }
  }, [paketId, queryClient, startHeartbeat]);

  const releaseLock = useCallback(async () => {
    stopHeartbeat();
    try {
      await base44.functions.invoke('releaseLockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId,
      });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    } catch (e) {
      console.error('[useLernpaketLock] releaseLockSecure error:', e);
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    }
  }, [paketId, queryClient, stopHeartbeat]);

  const forceUnlock = useCallback(async () => {
    stopHeartbeat();
    try {
      await base44.functions.invoke('releaseLockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId,
      });
    } catch (e) {
      console.error('[useLernpaketLock] forceUnlock error:', e);
    }
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
  }, [paketId, queryClient, stopHeartbeat]);

  return { acquireLock, releaseLock, forceUnlock, isLocking, lockError };
}