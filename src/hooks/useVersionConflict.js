/**
 * useVersionConflict.js
 * ──────────────────────
 * Kleiner Hook, der den State für den VersionConflictDialog verwaltet und
 * HTTP-409-Fehler erkennt.
 *
 * Usage:
 *   const conflict = useVersionConflict({ invalidateKeys: [['workspace-data', id]] });
 *   try { await save(); } catch (err) { if (!conflict.handle(err)) throw err; }
 *   <VersionConflictDialog {...conflict.dialogProps} />
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

function isVersionConflictError(err) {
  if (!err) return false;
  const status = err?.response?.status ?? err?.status;
  if (status === 409) return true;
  const code = err?.response?.data?.code ?? err?.code;
  if (code === 'VERSION_CONFLICT' || code === 'OPTIMISTIC_LOCK_FAILED') return true;
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('version conflict') || msg.includes('versionskonflikt');
}

/**
 * @param {object} opts
 * @param {Array<Array<any>>} [opts.invalidateKeys] – Query-Keys, die beim
 *        "verwerfen & neu laden" invalidiert werden sollen.
 * @param {(payload?: any) => Promise<any>} [opts.forceOverwriteFn] – optional,
 *        wird vom "Trotzdem überschreiben"-Button aufgerufen.
 * @param {boolean} [opts.canForceOverwrite] – RBAC-Entscheidung vom Aufrufer.
 */
export function useVersionConflict({
  invalidateKeys = [],
  forceOverwriteFn = null,
  canForceOverwrite = false,
} = {}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /** Ruft der Mutation-onError Handler auf: return true = Konflikt wurde behandelt. */
  const handle = useCallback((err) => {
    if (!isVersionConflictError(err)) return false;
    const data = err?.response?.data || {};
    setDetails({
      updatedBy: data.updated_by || data.last_modified_by || null,
      updatedAt: data.updated_at || data.last_modified_at || null,
    });
    setOpen(true);
    return true;
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setDetails(null);
    setIsProcessing(false);
  }, []);

  const discardAndReload = useCallback(async () => {
    setIsProcessing(true);
    await Promise.all(
      invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
    );
    close();
  }, [invalidateKeys, queryClient, close]);

  const forceOverwrite = useCallback(async () => {
    if (!forceOverwriteFn) return close();
    setIsProcessing(true);
    try {
      await forceOverwriteFn();
      close();
    } catch (err) {
      setIsProcessing(false);
      // Wenn der Force-Overwrite selbst fehlschlägt, Dialog offen lassen
      console.error('[useVersionConflict] Force overwrite failed:', err);
    }
  }, [forceOverwriteFn, close]);

  return {
    /** Im Mutation-onError aufrufen. Gibt true zurück, wenn der Konflikt behandelt wurde. */
    handle,
    /** Props für <VersionConflictDialog {...dialogProps} /> */
    dialogProps: {
      open,
      onOpenChange: (next) => (!next ? close() : setOpen(true)),
      onDiscardAndReload: discardAndReload,
      onForceOverwrite: forceOverwriteFn ? forceOverwrite : undefined,
      canForceOverwrite: canForceOverwrite && !!forceOverwriteFn,
      isProcessing,
      conflictDetails: details,
    },
    isOpen: open,
  };
}

export { isVersionConflictError };