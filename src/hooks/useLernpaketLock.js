import { useState, useRef, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const HEARTBEAT_INTERVAL = 30 * 1000; // alle 30 Sekunden (aligned mit Aktivitäten)

/**
 * Hook zum Verwalten des Lernpaket-Locks.
 * Gibt Methoden zum Sperren/Entsperren und den aktuellen Lock-Status zurück.
 */
export function useLernpaketLock(paketId, userEmail, onLockLost) {
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState(null);
  const queryClient = useQueryClient();
  const heartbeatRef = useRef(null);
  const onLockLostRef = useRef(onLockLost);
  onLockLostRef.current = onLockLost;

  const callLockApi = useCallback(async (action) => {
    return base44.functions.invoke('lernpaketLock', { action, paket_id: paketId });
  }, [paketId]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback((onLockLost) => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(async () => {
      try {
        const res = await callLockApi('heartbeat');
        // Warnung: Themenfeld gelöscht oder Einheit verschwunden
        if (res?.data?.warning) {
          setLockError(res.data.warning);
        }
        if (res?.data?.stale) {
          stopHeartbeat();
          setLockError('Die übergeordnete Einheit existiert nicht mehr.');
        }
      } catch (e) {
        // HTTP 403 = Lock nicht mehr vorhanden (z.B. nach Admin Force-Unlock oder Reaper)
        if (e?.response?.status === 403) {
          console.warn('[useLernpaketLock] Heartbeat 403: Lock verloren (extern aufgehoben)');
          stopHeartbeat();
          queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
          if (onLockLost) onLockLost();
        }
        // Andere Fehler ignorieren (Netzwerk-Fluktuationen)
      }
    }, HEARTBEAT_INTERVAL);
  }, [callLockApi, stopHeartbeat, queryClient]);

  // Cleanup beim Unmount (Seite schließen / Tab wechseln)
  useEffect(() => {
    return () => stopHeartbeat();
  }, [stopHeartbeat]);

  const acquireLock = useCallback(async () => {
    setIsLocking(true);
    setLockError(null);
    try {
      const res = await callLockApi('lock');
      if (res?.data?.success) {
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
        startHeartbeat(onLockLostRef.current);
        return { success: true };
      } else if (res?.data?.structural_lock) {
        // HTTP 423: Structural Lock aktiv
        setLockError(res.data.message || 'Struktur wird gerade angepasst.');
        return { success: false, structural_lock: true, message: res.data.message };
      } else {
        setLockError(res?.data?.message || res?.data?.locked_by || 'Gesperrt');
        return { success: false, locked_by: res?.data?.locked_by };
      }
    } catch (e) {
      // Axios wirft bei 4xx — response ist in e.response
      const data = e?.response?.data;
      if (data?.structural_lock) {
        const msg = data.message || 'Die Struktur der Einheit wird gerade angepasst.';
        setLockError(msg);
        return { success: false, structural_lock: true, message: msg };
      }
      setLockError('Fehler beim Sperren');
      return { success: false };
    } finally {
      setIsLocking(false);
    }
  }, [callLockApi, queryClient, startHeartbeat]);

  const releaseLock = useCallback(async (paketId) => {
    stopHeartbeat();
    try {
      // Sichere Backend-Funktion statt direktem SDK-Write
      await base44.functions.invoke('releaseLockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId || paketId,
      });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    } catch {
      // Fallback: direkt via lernpaketLock
      await callLockApi('unlock').catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    }
  }, [callLockApi, queryClient, stopHeartbeat]);

  const forceUnlock = useCallback(async () => {
    stopHeartbeat();
    await base44.functions.invoke('releaseLockSecure', {
      entityName: 'Lernpakete',
      entityId: paketId,
    }).catch(() => callLockApi('unlock'));
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
  }, [callLockApi, queryClient, stopHeartbeat, paketId]);

  return { acquireLock, releaseLock, forceUnlock, isLocking, lockError };
}