/**
 * useTaskLock.js
 *
 * Zentraler Hook für die Bearbeitungssperre (Locking) von Aufgaben.
 * Stellt isEditMode, canEdit, lockInfo sowie lock/unlock-Aktionen bereit.
 *
 * AUTO-TIMEOUT: Sperren älter als 60 Minuten werden automatisch ignoriert.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Minuten

/**
 * @param {object} aufgabe   - Die geladene Aufgabe (enthält locked_by, locked_at)
 * @param {string} userEmail - E-Mail des aktuellen Nutzers
 * @param {Function} lockFn  - Service-Funktion lockTask(taskId, userEmail)
 * @param {Function} unlockFn - Service-Funktion unlockTask(taskId)
 * @param {string[]} invalidateKeys - React-Query-Keys, die nach lock/unlock invalidiert werden
 */
export function useTaskLock({ aufgabe, userEmail, lockFn, unlockFn, invalidateKeys = [] }) {
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const isEditModeRef = useRef(false);
  const aufgabeIdRef = useRef(null);

  // Sperre als veraltet betrachten, wenn älter als LOCK_TIMEOUT_MS
  const isLockExpired = useCallback((lockedAt) => {
    if (!lockedAt) return true;
    return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
  }, []);

  const isLockedByOther =
    aufgabe?.locked_by &&
    aufgabe.locked_by !== userEmail &&
    !isLockExpired(aufgabe?.locked_at);

  const isLockedByMe =
    aufgabe?.locked_by === userEmail &&
    !isLockExpired(aufgabe?.locked_at);

  // Wenn die ausgewählte Aufgabe wechselt → Edit-Mode zurücksetzen (ohne unlock, 
  // das macht der Cleanup-Effekt unten)
  useEffect(() => {
    if (aufgabe?.id !== aufgabeIdRef.current) {
      setIsEditMode(false);
      isEditModeRef.current = false;
      aufgabeIdRef.current = aufgabe?.id ?? null;
    }
  }, [aufgabe?.id]);

  // Cleanup: Beim Unmount der Komponente oder Aufgaben-Wechsel unlock auslösen
  useEffect(() => {
    return () => {
      if (isEditModeRef.current && aufgabeIdRef.current) {
        unlockFn(aufgabeIdRef.current).catch(() => {});
      }
    };
  }, [unlockFn]);

  const enterEditMode = useCallback(async () => {
    if (!aufgabe?.id) {
      return;
    }
    setIsLocking(true);
    try {
      await lockFn(aufgabe.id, userEmail);
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      setIsEditMode(true);
      isEditModeRef.current = true;
      toast.success('Bearbeitungsmodus aktiviert – Sie können die Aufgabe jetzt ändern.');
    } catch (err) {
      // Spezifische Fehlermeldungen je nach Fehlertyp
      const errorMsg = err.message || '';
      
      if (errorMsg.includes('locked') || errorMsg.includes('Sperre')) {
        toast.error(`Bearbeiten nicht möglich: Diese Aufgabe wird gerade von ${aufgabe?.locked_by || 'einem anderen Nutzer'} bearbeitet.`);
      } else if (errorMsg.includes('sync_status') || errorMsg.includes('pending') || errorMsg.includes('Export')) {
        toast.error('Bearbeiten nicht möglich: Die Aufgabe befindet sich noch im Export-Prozess (Moodle/Brian).');
      } else {
        toast.error(errorMsg || 'Aufgabe konnte nicht gesperrt werden.');
      }
    } finally {
      setIsLocking(false);
    }
  }, [aufgabe?.id, aufgabe?.locked_by, userEmail, lockFn, invalidateKeys, queryClient]);

  const exitEditMode = useCallback(async () => {
    if (!aufgabe?.id) return;
    try {
      await unlockFn(aufgabe.id);
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
    } catch {
      // Sperre trotzdem lokal aufheben
    } finally {
      setIsEditMode(false);
      isEditModeRef.current = false;
    }
  }, [aufgabe?.id, unlockFn, invalidateKeys, queryClient]);

  return {
    isEditMode,
    isLocking,
    isLockedByOther,
    isLockedByMe,
    lockedByEmail: isLockedByOther ? aufgabe?.locked_by : null,
    enterEditMode,
    exitEditMode,
  };
}