/**
 * useActivityLock.js
 *
 * Pessimistic Locking für LernpaketPhaseAktivitaet (Masteraufgaben).
 *
 * Architektur:
 * - lock_status, locked_by_user, locked_at werden direkt in der Entity gespeichert
 * - Realtime-Subscription sorgt für sofortiges UI-Update bei allen Nutzern
 * - Heartbeat alle 30s: hält lock_at frisch → setzt implizit "ich bin noch da"
 * - Auto-Unlock: wenn locked_at > 2 Minuten alt → gilt als abgelaufen (geprüft im UI)
 * - Cleanup bei unmount: Lock wird freigegeben + Heartbeat gestoppt
 */

import { useCallback, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const LOCK_TIMEOUT_MS = 2 * 60 * 1000;  // 2 Minuten
const HEARTBEAT_MS   = 30 * 1000;       // 30 Sekunden

/**
 * Prüft ob ein Lock abgelaufen ist.
 */
export function isLockExpired(lockedAt) {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}

/**
 * Gibt true zurück wenn jemand anderes diese Aktivität gerade (aktiv) sperrt.
 */
export function isActivityLockedByOther(activity, myEmail) {
  if (!activity?.lock_status) return false;
  if (activity.locked_by_user === myEmail) return false;
  if (isLockExpired(activity.locked_at)) return false;
  return true;
}

/**
 * Hook für pessimistic locking einer einzelnen Aktivität.
 *
 * @param {string|null} activityId - ID der LernpaketPhaseAktivitaet
 * @param {string} userEmail       - E-Mail des aktuellen Nutzers
 * @param {boolean} active         - true = Lock soll beim Aufruf gehalten werden (editMode)
 */
export function useActivityLock(activityId, userEmail, active) {
  const queryClient = useQueryClient();
  const heartbeatRef = useRef(null);
  const heldRef = useRef(false);       // verhindert doppelte acquire/release
  const userEmailRef = useRef(userEmail);
  useEffect(() => { userEmailRef.current = userEmail; }, [userEmail]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
  }, [queryClient]);

  // ── Lock erwerben ──────────────────────────────────────────────────────────
  const acquireLock = useCallback(async () => {
    if (!activityId || !userEmail) return false;

    // Aktuellen Zustand prüfen
    const records = await base44.entities.LernpaketPhaseAktivitaet.filter({ id: activityId });
    const record = records[0];
    if (!record) return false;

    // Bereits von anderem aktiven User gesperrt?
    if (record.lock_status && record.locked_by_user !== userEmail && !isLockExpired(record.locked_at)) {
      return false;
    }

    await base44.entities.LernpaketPhaseAktivitaet.update(activityId, {
      lock_status: true,
      locked_by_user: userEmail,
      locked_at: new Date().toISOString(),
    });

    heldRef.current = true;
    invalidate();
    return true;
  }, [activityId, userEmail, invalidate]);

  // ── Lock freigeben ─────────────────────────────────────────────────────────
  const releaseLock = useCallback(async () => {
    if (!activityId || !heldRef.current) return;

    heldRef.current = false;
    await base44.entities.LernpaketPhaseAktivitaet.update(activityId, {
      lock_status: false,
      locked_by_user: '',
      locked_at: null,
    });
    invalidate();
  }, [activityId, invalidate]);

  // ── Heartbeat: hält locked_at UND lock_status frisch ────────────────────────
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(async () => {
      if (!heldRef.current || !activityId) return;
      // Prüfe ob unser Lock noch gültig ist (könnte extern resettet worden sein)
      const records = await base44.entities.LernpaketPhaseAktivitaet.filter({ id: activityId });
      const record = records[0];
      if (record && record.locked_by_user === userEmailRef.current) {
        // Lock gehört noch uns: erneuern
        await base44.entities.LernpaketPhaseAktivitaet.update(activityId, {
          lock_status: true,
          locked_at: new Date().toISOString(),
        });
      } else {
        // Lock wurde extern aufgehoben → Heartbeat stoppen
        heldRef.current = false;
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }, HEARTBEAT_MS);
  }, [activityId, userEmail]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  // ── Reaktion auf active-Flag (editMode) ────────────────────────────────────
  useEffect(() => {
    if (active) {
      acquireLock().then(ok => {
        if (ok) startHeartbeat();
      });
    } else {
      stopHeartbeat();
      releaseLock();
    }
    // Cleanup bei unmount
    return () => {
      stopHeartbeat();
      if (heldRef.current) releaseLock();
    };
  }, [active, activityId]);

  // ── Page-unload Fallback ───────────────────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      if (!heldRef.current || !activityId) return;
      // Synchroner Fetch (Best-effort) beim Tab-Close
      navigator.sendBeacon && navigator.sendBeacon('/api/noop');
      // Relying on background task — primary protection is the 2min timeout
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [activityId]);

  return { acquireLock, releaseLock };
}

/**
 * Gleicher Hook für Aufgabenbausteine (Klone).
 */
export function useKlonLock(klonId, userEmail, active) {
  const queryClient = useQueryClient();
  const heartbeatRef = useRef(null);
  const heldRef = useRef(false);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine', 'klone'] });
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
  }, [queryClient]);

  const acquireLock = useCallback(async () => {
    if (!klonId || !userEmail) return false;
    const records = await base44.entities.Aufgabenbausteine.filter({ id: klonId });
    const record = records[0];
    if (!record) return false;
    if (record.lock_status && record.locked_by_user !== userEmail && !isLockExpired(record.locked_at)) {
      return false;
    }
    await base44.entities.Aufgabenbausteine.update(klonId, {
      lock_status: true,
      locked_by_user: userEmail,
      locked_at: new Date().toISOString(),
    });
    heldRef.current = true;
    invalidate();
    return true;
  }, [klonId, userEmail, invalidate]);

  const releaseLock = useCallback(async () => {
    if (!klonId || !heldRef.current) return;
    heldRef.current = false;
    await base44.entities.Aufgabenbausteine.update(klonId, {
      lock_status: false,
      locked_by_user: '',
      locked_at: null,
    });
    invalidate();
  }, [klonId, invalidate]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(async () => {
      if (!heldRef.current || !klonId) return;
      await base44.entities.Aufgabenbausteine.update(klonId, {
        locked_at: new Date().toISOString(),
      });
    }, HEARTBEAT_MS);
  }, [klonId]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (active) {
      acquireLock().then(ok => { if (ok) startHeartbeat(); });
    } else {
      stopHeartbeat();
      releaseLock();
    }
    return () => {
      stopHeartbeat();
      if (heldRef.current) releaseLock();
    };
  }, [active, klonId]);

  return { acquireLock, releaseLock };
}