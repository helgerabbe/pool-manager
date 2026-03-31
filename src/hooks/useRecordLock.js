import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook: Record-Locking für Aufgabenbausteine.
 *
 * Gibt Hilfsfunktionen zurück:
 *  - acquireLock(aufgabeId, userEmail) — setzt lock_status=true
 *  - releaseLock(aufgabeId)            — setzt lock_status=false
 *  - forceReleaseLock(aufgabeId)       — Admin-Override ohne Prüfung
 *  - isLockedByOther(aufgabe, userEmail) — true wenn jemand anderes den Lock hält
 */
export function useRecordLock() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
  }, [queryClient]);

  /**
   * Lock setzen – nur wenn noch kein anderer User den Lock hält.
   * Gibt true zurück wenn erfolgreich, false wenn Lock bereits vergeben.
   */
  const acquireLock = useCallback(async (aufgabeId, userEmail) => {
    const records = await base44.entities.Aufgabenbausteine.filter({ id: aufgabeId });
    const record = records[0];

    if (!record) return false;

    // Lock bereits von anderem User gehalten?
    if (record.lock_status && record.locked_by_user && record.locked_by_user !== userEmail) {
      return false;
    }

    await base44.entities.Aufgabenbausteine.update(aufgabeId, {
      lock_status: true,
      locked_by_user: userEmail,
    });

    invalidate();
    return true;
  }, [invalidate]);

  /**
   * Lock freigeben – nur wenn der aktuelle User den Lock hält.
   */
  const releaseLock = useCallback(async (aufgabeId, userEmail) => {
    const records = await base44.entities.Aufgabenbausteine.filter({ id: aufgabeId });
    const record = records[0];

    if (!record) return;

    // Nur freigeben wenn ich selbst der Lock-Inhaber bin
    if (record.locked_by_user !== userEmail) return;

    await base44.entities.Aufgabenbausteine.update(aufgabeId, {
      lock_status: false,
      locked_by_user: '',
    });

    invalidate();
  }, [invalidate]);

  /**
   * Admin-Override: Lock erzwungen freigeben, unabhängig vom Inhaber.
   */
  const forceReleaseLock = useCallback(async (aufgabeId) => {
    await base44.entities.Aufgabenbausteine.update(aufgabeId, {
      lock_status: false,
      locked_by_user: '',
    });
    invalidate();
  }, [invalidate]);

  /**
   * Prüft ob ein Datensatz von jemand anderem gesperrt ist.
   */
  const isLockedByOther = useCallback((aufgabe, userEmail) => {
    return aufgabe?.lock_status === true && aufgabe?.locked_by_user !== userEmail;
  }, []);

  return { acquireLock, releaseLock, forceReleaseLock, isLockedByOther };
}