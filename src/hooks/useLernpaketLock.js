/**
 * useLernpaketLock
 * 
 * Single Source of Truth: Lernpaket-Lock als einzige Wahrheit.
 * 
 * Beim Mount:
 * - Ruft checkLock auf → is_locked? locked_by_email?
 * - Wenn is_locked === true UND locked_by_email === currentUser.email → canEdit = true
 * 
 * Heartbeat (alle 20s wenn locked):
 * - Erneuert locked_at Timestamp
 * 
 * Bei Exit/Unmount:
 * - Ruft releaseLock auf
 * 
 * Returns: {canEdit, isLockedByOther, lockedByEmail, acquireLock, releaseLock}
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const HEARTBEAT_INTERVAL = 20_000; // 20 Sekunden

export function useLernpaketLock(lernpaketId) {
  const [canEdit, setCanEdit] = useState(false);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockedByEmail, setLockedByEmail] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const heartbeatRef = useRef(null);
  const heldRef = useRef(false);
  const mountedRef = useRef(true);

  // User laden
  useEffect(() => {
    base44.auth.me().then(u => setUserEmail(u?.email || null));
  }, []);

  // Lock-Status prüfen
  const checkLock = useCallback(async () => {
    if (!lernpaketId || !userEmail) return;
    
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('checkLockSecure', {
        lernpaketId,
      });

      const { is_locked, locked_by_email } = response.data;

      if (!mountedRef.current) return;

      if (is_locked) {
        const isMine = locked_by_email === userEmail;
        setCanEdit(isMine);
        setIsLockedByOther(!isMine);
        setLockedByEmail(locked_by_email);

        if (isMine) {
          heldRef.current = true;
          startHeartbeat();
        }
      } else {
        setCanEdit(false);
        setIsLockedByOther(false);
        setLockedByEmail(null);
        heldRef.current = false;
      }
    } catch (error) {
      console.warn('[useLernpaketLock] checkLock failed:', error.message);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [lernpaketId, userEmail]);

  // Heartbeat starten
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;

    heartbeatRef.current = setInterval(async () => {
      if (!heldRef.current || !lernpaketId || !userEmail) return;

      try {
        // Erneuere locked_at Timestamp
        await base44.entities.Lernpakete.update(lernpaketId, {
          locked_at: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[useLernpaketLock] Heartbeat failed:', error.message);
        // Weitermachen trotzdem – Server timeout macht den Rest
      }
    }, HEARTBEAT_INTERVAL);
  }, [lernpaketId, userEmail]);

  // Heartbeat stoppen
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // Lock erwerben
  const acquireLock = useCallback(async () => {
    if (!lernpaketId || !userEmail) return false;

    try {
      await base44.functions.invoke('acquireLockSimple', {
        lernpaketId,
      });

      heldRef.current = true;
      setCanEdit(true);
      setIsLockedByOther(false);
      setLockedByEmail(userEmail);
      startHeartbeat();
      return true;
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;

      if (status === 409 && code === 'ALREADY_LOCKED') {
        const lockedBy = error?.response?.data?.locked_by_email;
        setIsLockedByOther(true);
        setLockedByEmail(lockedBy);
      }

      console.warn('[useLernpaketLock] acquireLock failed:', error.message);
      return false;
    }
  }, [lernpaketId, userEmail, startHeartbeat]);

  // Lock freigeben
  const releaseLock = useCallback(async () => {
    if (!lernpaketId || !userEmail) return;

    stopHeartbeat();
    heldRef.current = false;
    setCanEdit(false);

    try {
      await base44.functions.invoke('releaseLockSimple', {
        lernpaketId,
      });
    } catch (error) {
      console.warn('[useLernpaketLock] releaseLock failed:', error.message);
    }
  }, [lernpaketId, userEmail, stopHeartbeat]);

  // Initial check beim Mount
  useEffect(() => {
    checkLock();
  }, [lernpaketId, userEmail, checkLock]);

  // beforeunload: Nur bei echtem Browser-Close Lock freigeben
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (heldRef.current) {
        // Sync releaseLock (beforeunload erlaubt keine async calls)
        stopHeartbeat();
        heldRef.current = false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stopHeartbeat]);

  // Cleanup bei Unmount: Nur Heartbeat stoppen, NICHT releaseLock
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopHeartbeat();
      // NICHT releaseLock hier – Lock bleibt erhalten für Tab-Wechsel!
    };
  }, [stopHeartbeat]);

  return {
    canEdit,
    isLockedByOther,
    lockedByEmail,
    isLoading,
    acquireLock,
    releaseLock,
  };
}