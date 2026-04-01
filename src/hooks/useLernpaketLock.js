import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // alle 5 Minuten

/**
 * Hook zum Verwalten des Lernpaket-Locks.
 * Gibt Methoden zum Sperren/Entsperren und den aktuellen Lock-Status zurück.
 */
export function useLernpaketLock(paketId, userEmail) {
  const [isLocking, setIsLocking] = useState(false);
  const [lockError, setLockError] = useState(null);
  const queryClient = useQueryClient();
  const heartbeatRef = useRef(null);

  const callLockApi = useCallback(async (action) => {
    return base44.functions.invoke('lernpaketLock', { action, paket_id: paketId });
  }, [paketId]);

  const startHeartbeat = useCallback(() => {
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
      } catch {
        // Heartbeat fehlgeschlagen – ignorieren
      }
    }, HEARTBEAT_INTERVAL);
  }, [callLockApi, stopHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

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
        startHeartbeat();
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

  const releaseLock = useCallback(async () => {
    stopHeartbeat();
    try {
      await callLockApi('unlock');
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    } catch {
      // Fehler beim Entsperren ignorieren – Lock läuft nach 30 Min ab
    }
  }, [callLockApi, queryClient, stopHeartbeat]);

  const forceUnlock = useCallback(async () => {
    stopHeartbeat();
    await callLockApi('unlock');
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
  }, [callLockApi, queryClient, stopHeartbeat]);

  return { acquireLock, releaseLock, forceUnlock, isLocking, lockError };
}