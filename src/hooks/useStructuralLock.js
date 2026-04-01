/**
 * useStructuralLock
 * ─────────────────
 * Setzt/löst einen "structural_lock" auf Einheitsebene.
 * Solange dieser Lock aktiv ist, können andere Nutzer keine neuen
 * Content-Locks (Lernpaket-Bearbeitungen) starten.
 *
 * Mechanismus:
 * - Lock: Einheiten.structural_lock = email + structural_locked_at = timestamp
 * - Unlock: bei unmount (useEffect cleanup) + window.beforeunload
 * - Auto-Timeout: 60 Min (Server-seitig geprüft im lernpaketLock-Handler)
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const LOCK_TIMEOUT_MS = 60 * 60 * 1000; // 60 Min

export function useStructuralLock(einheitId) {
  const queryClient = useQueryClient();
  const acquiredRef = useRef(false);
  const emailRef    = useRef(null);

  const release = useCallback(async () => {
    if (!acquiredRef.current || !einheitId || !emailRef.current) return;
    acquiredRef.current = false;
    await base44.entities.Einheiten.update(einheitId, {
      structural_lock: null,
      structural_locked_at: null,
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['einheiten', einheitId] });
  }, [einheitId, queryClient]);

  useEffect(() => {
    if (!einheitId) return;

    let cancelled = false;

    (async () => {
      const user = await base44.auth.me();
      if (!user || cancelled) return;
      emailRef.current = user.email;

      // Prüfe ob bereits jemand anderes einen Structural Lock hält
      const records = await base44.entities.Einheiten.filter({ id: einheitId });
      const einheit = records[0];
      if (!einheit || cancelled) return;

      if (einheit.structural_lock && einheit.structural_lock !== user.email) {
        const lockedAt = einheit.structural_locked_at ? new Date(einheit.structural_locked_at).getTime() : 0;
        const isExpired = Date.now() - lockedAt > LOCK_TIMEOUT_MS;
        if (!isExpired) {
          // Fremder Lock aktiv → kein eigener Lock nötig (nur lesen)
          return;
        }
      }

      // Lock setzen
      await base44.entities.Einheiten.update(einheitId, {
        structural_lock: user.email,
        structural_locked_at: new Date().toISOString(),
      });
      acquiredRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['einheiten', einheitId] });
    })();

    const handleUnload = () => { release(); };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', handleUnload);
      release();
    };
  }, [einheitId, release, queryClient]);

  return { release };
}

/**
 * Prüft ob eine Einheit aktuell einen aktiven Structural Lock hat
 * (von jemand anderem als dem aktuellen Nutzer).
 */
export function isStructurallyLocked(einheit, currentUserEmail) {
  if (!einheit?.structural_lock) return false;
  if (einheit.structural_lock === currentUserEmail) return false;
  const lockedAt = einheit.structural_locked_at ? new Date(einheit.structural_locked_at).getTime() : 0;
  return Date.now() - lockedAt < LOCK_TIMEOUT_MS;
}