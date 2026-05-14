import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * ZENTRALE LOCK-ENGINE
 * Verwaltet den gesamten Lebenszyklus von Sperren, Polling und Heartbeats absolut sicher.
 */
function useGenericLock({
  resourceId,
  checkFn,          // () => Promise<{ isLocked, lockedByEmail, lockedAt }>
  acquireFn,        // () => Promise<void>
  releaseFn,        // () => Promise<void>
  heartbeatFn,      // () => Promise<void>
  pollIntervalMs = null,
  heartbeatIntervalMs = null,
  // AFK-Polish 2026-05-14: Stale-Schwelle im Client von 60 auf 5 Min
  // gesenkt — synchron zu den Backend-Konstanten in acquireLockSecure /
  // acquireUnitLockSecure / lockReaper. Der Heartbeat alle 25 s hält
  // aktive Sessions weiterhin sicher offen.
  timeoutMs = 5 * 60 * 1000,
}) {
  const [userEmail, setUserEmail] = useState(null);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockedByEmail, setLockedByEmail] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  const mountedRef = useRef(true);
  const heldRef = useRef(false);
  const intervalRef = useRef(null); // Nutzt ein Intervall für Polling ODER Heartbeat

  // ⚠️ Rate-Limit-Fix (2026-04-27):
  // Die Funktions-Props (checkFn, acquireFn, releaseFn, heartbeatFn) werden
  // von den konsumierenden Hooks (useLernpaketLock etc.) als INLINE-Lambdas
  // übergeben und damit bei JEDEM Render neu erzeugt. Wenn sie als
  // useCallback/useEffect-Dependencies gehalten werden, feuert der Initial-
  // Check pro Render – das hat das globale Base44-API-Rate-Limit für
  // checkLockSecure ausgelöst. Wir halten die jeweils aktuellste Funktion
  // in einem Ref, sodass der Check-Effekt nur noch von `resourceId` und
  // `userEmail` abhängt.
  const checkFnRef = useRef(checkFn);
  const acquireFnRef = useRef(acquireFn);
  const releaseFnRef = useRef(releaseFn);
  const heartbeatFnRef = useRef(heartbeatFn);
  useEffect(() => { checkFnRef.current = checkFn; }, [checkFn]);
  useEffect(() => { acquireFnRef.current = acquireFn; }, [acquireFn]);
  useEffect(() => { releaseFnRef.current = releaseFn; }, [releaseFn]);
  useEffect(() => { heartbeatFnRef.current = heartbeatFn; }, [heartbeatFn]);

  // 1. User initialisieren
  useEffect(() => {
    mountedRef.current = true;
    base44.auth.me().then(u => { if (mountedRef.current) setUserEmail(u?.email || null); });
    return () => { mountedRef.current = false; };
  }, []);

  const isExpired = useCallback((lockedAt) => {
    if (!lockedAt) return false;
    return Date.now() - new Date(lockedAt).getTime() > timeoutMs;
  }, [timeoutMs]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 2. Status prüfen (Polling) mit Retry-Logic für Rate Limits
  const checkStatus = useCallback(async (retryCount = 0) => {
    const cFn = checkFnRef.current;
    if (!resourceId || !cFn) return;
    try {
      const { isLocked, lockedByEmail: byEmail, lockedAt } = await cFn(resourceId);
      if (!mountedRef.current) return;

      const expired = isExpired(lockedAt);
      if (isLocked && !expired) {
        const isMine = byEmail === userEmail;
        setIsLockedByOther(!isMine);
        setLockedByEmail(byEmail);
        // Setze canEdit nur, wenn wir nicht explizit acquireFn nutzen müssen (wie bei Einheit)
        if (!acquireFnRef.current) setCanEdit(isMine);
      } else {
        setIsLockedByOther(false);
        setLockedByEmail(null);
        if (!acquireFnRef.current) setCanEdit(false);
      }
    } catch (e) {
      // Rate limit (429) mit Exponential Backoff retry
      if (e?.status === 429 && retryCount < 2) {
        const delay = Math.pow(2, retryCount + 1) * 1000; // 2s, 4s
        setTimeout(() => checkStatus(retryCount + 1), delay);
        return;
      }
      console.warn('[useLocks] Check failed:', e.message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [resourceId, userEmail, isExpired]);

  // 3. Heartbeat oder Polling starten
  const startTimer = useCallback(() => {
    clearTimer();
    if (heartbeatIntervalMs && heartbeatFnRef.current && heldRef.current) {
      intervalRef.current = setInterval(
        () => heartbeatFnRef.current(resourceId).catch(() => {}),
        heartbeatIntervalMs
      );
    } else if (pollIntervalMs && checkFnRef.current) {
      intervalRef.current = setInterval(checkStatus, pollIntervalMs);
    }
  }, [resourceId, heartbeatIntervalMs, pollIntervalMs, checkStatus, clearTimer]);

  // 4. Initialer Aufruf & Polling Setup
  useEffect(() => {
    if (userEmail && resourceId) {
      checkStatus();
      if (pollIntervalMs && !heldRef.current) startTimer();
    }
    return clearTimer;
  }, [userEmail, resourceId, pollIntervalMs, checkStatus, startTimer, clearTimer]);

  // 5. Sperre erwerben
  //
  // Bug-Fix 2026-05-14: Das Base44-SDK wirft bei HTTP-409/423/500 NICHT
  // immer eine Exception – stattdessen kommt `{ data, status }` zurück.
  // Wir prüfen den Status und das `error`-Feld explizit, sonst würde
  // `canEdit` fälschlich auf `true` springen, obwohl das Backend den
  // Lock gar nicht vergeben hat. Folge: Save schlug serverseitig mit
  // LOCK_NOT_HELD fehl und das UI blieb stumm.
  const acquire = useCallback(async () => {
    const aFn = acquireFnRef.current;
    if (!resourceId || !userEmail || !aFn) return false;
    setErrorMessage(null);
    try {
      const res = await aFn(resourceId, userEmail);
      const data = res?.data ?? res;
      const status = res?.status;
      const failed =
        (status !== undefined && status >= 400) ||
        (data && (data.success === false || data.error));
      if (failed) {
        const msg = data?.error || 'Lock konnte nicht erworben werden.';
        setErrorMessage(msg);
        setIsLockedByOther(true);
        setLockedByEmail(data?.locked_by_email || null);
        return false;
      }
      heldRef.current = true;
      setCanEdit(true);
      setIsLockedByOther(false);
      setLockedByEmail(userEmail);
      startTimer(); // Startet Heartbeat
      return true;
    } catch (error) {
      const msg = error?.response?.data?.error || error.message;
      setErrorMessage(msg);
      setIsLockedByOther(true);
      setLockedByEmail(error?.response?.data?.locked_by_email);
      return false;
    }
  }, [resourceId, userEmail, startTimer]);

  // 6. Sperre freigeben
  const release = useCallback(async () => {
    const rFn = releaseFnRef.current;
    if (!resourceId || !rFn) return;
    clearTimer();
    heldRef.current = false;
    setCanEdit(false);
    try {
      await rFn(resourceId);
      setIsLockedByOther(false);
      setLockedByEmail(null);
      if (pollIntervalMs) startTimer(); // Zurück zum Polling
    } catch (e) {
      console.warn('[useLocks] Release failed');
    }
  }, [resourceId, clearTimer, pollIntervalMs, startTimer]);

  // 7. Sicherheitsnetz: Tab-Close (beforeunload)
  useEffect(() => {
    const handleUnload = () => { if (heldRef.current) clearTimer(); };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [clearTimer]);

  return { canEdit, isLockedByOther, lockedByEmail, isLoading, errorMessage, acquire, release, userEmail };
}


// ============================================================================
// EXPORTS DER SPEZIFISCHEN HOOKS (Rückwärtskompatibel zu den alten Dateien)
// ============================================================================

export function useLernpaketLock(lernpaketId) {
   // Phase 3 Cleanup: Kein Polling mehr – Lock-Status wird per SSE in den Query-Cache gepatcht.
   const lock = useGenericLock({
     resourceId: lernpaketId,
     checkFn: async (id) => {
       const res = await base44.functions.invoke('checkLockSecure', { lernpaketId: id });
       return { isLocked: res.data.is_locked, lockedByEmail: res.data.locked_by_email, lockedAt: res.data.locked_at };
     },
     acquireFn: async (id) => base44.functions.invoke('acquireLockSecure', { lernpaketId: id }),
     releaseFn: async (id) => base44.functions.invoke('releaseLernpaketLockSecure', { lernpaketId: id }),
     heartbeatFn: async (id) => base44.entities.Lernpakete.update(id, { locked_at: new Date().toISOString() }),
     heartbeatIntervalMs: 25000,
     // pollIntervalMs: ENTFERNT – SSE übernimmt Realtime-Updates.
   });

  return {
    canEdit: lock.canEdit,
    isLockedByOther: lock.isLockedByOther,
    lockedByEmail: lock.lockedByEmail,
    lockErrorMessage: lock.errorMessage,
    isLoading: lock.isLoading,
    acquireLock: lock.acquire,
    releaseLock: lock.release,
  };
}

export function useEinheitLock(einheitId) {
  // Phase 3 Cleanup: Kein Polling mehr – Unit-Lock-Status kommt per SSE.
  const lock = useGenericLock({
    resourceId: einheitId,
    checkFn: async (id) => {
      const e = await base44.entities.Einheiten.get(id);
      return { isLocked: e?.is_unit_locked, lockedByEmail: e?.unit_locked_by_email };
    },
    // pollIntervalMs: ENTFERNT – SSE übernimmt Realtime-Updates.
  });

  return {
    isUnitLocked: lock.isLockedByOther,
    lockedByEmail: lock.lockedByEmail,
    userEmail: lock.userEmail,
    isLoading: lock.isLoading,
  };
}

export function useTaskLock({ aufgabe, userEmail, lockFn, unlockFn, invalidateKeys = [] }) {
  const queryClient = useQueryClient();
  const lock = useGenericLock({
    resourceId: aufgabe?.id,
    checkFn: async () => ({ isLocked: !!aufgabe?.locked_by, lockedByEmail: aufgabe?.locked_by, lockedAt: aufgabe?.locked_at }),
    acquireFn: async (id, email) => lockFn(id, email),
    releaseFn: async (id) => unlockFn(id),
  });

  const enterEditMode = async () => {
    const success = await lock.acquire();
    if (success) {
      invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
      toast.success('Bearbeitungsmodus aktiviert.');
    } else {
      toast.error(lock.errorMessage || 'Aufgabe konnte nicht gesperrt werden.');
    }
  };

  const exitEditMode = async () => {
    await lock.release();
    invalidateKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
  };

  return {
    isEditMode: lock.canEdit,
    isLocking: lock.isLoading,
    isLockedByOther: lock.isLockedByOther,
    isLockedByMe: lock.canEdit,
    lockedByEmail: lock.lockedByEmail,
    enterEditMode,
    exitEditMode,
  };
}