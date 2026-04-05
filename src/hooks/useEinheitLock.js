import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useEinheitLock – Makro-Lock Hook für Einheiten
 *
 * Prüft den Makro-Lock-Status der übergeordneten Einheit.
 * Wenn is_unit_locked === true und unit_locked_by_email !== currentUser.email:
 *   - canEdit wird false (globale Blockade)
 *   - UI wird in Read-Only-Modus versetzt
 *   - Ein Banner wird über dem Inhaltsbereich angezeigt
 *
 * Returns: { isUnitLocked, lockedByEmail, userEmail, isLoading }
 */
export function useEinheitLock(einheitId) {
  const [isUnitLocked, setIsUnitLocked] = useState(false);
  const [lockedByEmail, setLockedByEmail] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkIntervalRef = useRef(null);

  // Lade Einheit-Lock-Status
  const checkLockStatus = async () => {
    try {
      if (!einheitId) {
        setIsLoading(false);
        return;
      }

      const einheit = await base44.entities.Einheiten.get(einheitId);
      if (!einheit) {
        setIsLoading(false);
        return;
      }

      setIsUnitLocked(einheit.is_unit_locked || false);
      setLockedByEmail(einheit.unit_locked_by_email || null);
    } catch (error) {
      console.error('[useEinheitLock] Error checking lock status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialisierung + Heartbeat
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setUserEmail(user.email);
        }
      } catch (error) {
        console.error('[useEinheitLock] Error getting current user:', error);
      }
    };

    initializeUser();
    checkLockStatus();

    // Poll alle 5 Sekunden
    checkIntervalRef.current = setInterval(checkLockStatus, 5000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [einheitId]);

  return {
    isUnitLocked: isUnitLocked && lockedByEmail !== userEmail,
    lockedByEmail,
    userEmail,
    isLoading,
  };
}