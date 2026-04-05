import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useLernpaketLockGlobal } from '@/lib/LernpaketLockContext';

/**
 * useLernpaketLockHierarchical
 * 
 * Hook für hierarchisches Locking: Lernpaket als Single Source of Truth.
 * Der Lock wird im globalen Context gespeichert und von allen Tab-Komponenten geteilt.
 * 
 * Heartbeat und Cleanup sind zentral pro Lernpaket.
 */
export function useLernpaketLockHierarchical(paketId, userEmail, onLockLostCallback) {
  const queryClient = useQueryClient();
  const globalLock = useLernpaketLockGlobal();
  const [isLocking, setIsLocking] = useState(false);
  const heartbeatIntervalRef = useRef(null);
  const lockLostRef = useRef(false);

  // Heartbeat starten/stoppen
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) return; // Nur einmal starten

    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        const result = await base44.functions.invoke('validateLockSecure', {
          entityName: 'Lernpakete',
          entityId: paketId,
        });

        if (!result?.data?.still_locked) {
          // Lock wurde extern aufgehoben
          lockLostRef.current = true;
          globalLock.clearLock();
          if (onLockLostCallback) onLockLostCallback();
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } catch (err) {
        console.error('[Heartbeat] Fehler bei Lock-Validierung:', err);
      }
    }, 15000); // 15 Sekunden
  }, [paketId, globalLock, onLockLostCallback]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Browser unload: Lock freigeben
  useEffect(() => {
    const handleUnload = () => {
      if (globalLock.isLockedByMe(paketId, userEmail)) {
        base44.functions
          .invoke('releaseLockSecure', {
            entityName: 'Lernpakete',
            entityId: paketId,
          })
          .catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [paketId, userEmail, globalLock]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  const acquireLock = useCallback(async () => {
    if (globalLock.currentLockedLernpaketId && globalLock.currentLockedLernpaketId !== paketId) {
      toast.error('Ein anderes Lernpaket ist bereits gesperrt.');
      return false;
    }

    setIsLocking(true);
    try {
      const result = await base44.functions.invoke('acquireLockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId,
      });

      if (result?.data?.success) {
        globalLock.setLocked(paketId, userEmail);
        startHeartbeat();
        return true;
      } else if (result?.data?.locked_by) {
        toast.error(`Dieses Paket wird gerade von ${result.data.locked_by} bearbeitet.`);
        return false;
      } else if (result?.data?.structural_lock) {
        toast.error(result?.data?.message || 'Strukturbearbeitung läuft — neue Inhalts-Bearbeitungen sind kurzzeitig gesperrt.');
        return false;
      }
      return false;
    } catch (err) {
      console.error('[acquireLock] Fehler:', err);
      toast.error('Fehler beim Aktivieren des Bearbeitungsmodus.');
      return false;
    } finally {
      setIsLocking(false);
    }
  }, [paketId, userEmail, globalLock, startHeartbeat]);

  const releaseLock = useCallback(async () => {
    stopHeartbeat();
    try {
      await base44.functions.invoke('releaseLockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId,
      });
      globalLock.clearLock();
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    } catch (err) {
      console.error('[releaseLock] Fehler:', err);
    }
  }, [paketId, globalLock, queryClient, stopHeartbeat]);

  const forceUnlock = useCallback(async () => {
    try {
      await base44.functions.invoke('forceUnlockSecure', {
        entityName: 'Lernpakete',
        entityId: paketId,
      });
      globalLock.clearLock();
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      toast.success('Sperre aufgehoben.');
    } catch (err) {
      console.error('[forceUnlock] Fehler:', err);
      toast.error('Fehler beim Aufheben der Sperre.');
    }
  }, [paketId, globalLock, queryClient]);

  return {
    acquireLock,
    releaseLock,
    forceUnlock,
    isLocking,
    isLockedByMe: globalLock.isLockedByMe(paketId, userEmail),
    isLockedByOther: globalLock.isLockedByOther(paketId, userEmail),
    lockedByUser: globalLock.lockedByUser,
  };
}