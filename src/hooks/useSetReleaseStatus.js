/**
 * hooks/useSetReleaseStatus.js
 *
 * Phase 4 des Freigabe-Konzepts (2026-05-14):
 * Convenience-Hook für den Aufruf von `setReleaseStatusSecure` aus
 * jedem Modal/Panel. Liefert eine `mutate({ targetType, targetId, release })`-
 * Funktion + Lade-/Fehlerzustand und invalidiert die relevanten Caches.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * @param {object} options
 *   onSuccess?:  (response) => void
 *   onError?:    (error)    => void
 *   invalidateKeys?: string[] | string[][]  - React-Query-Keys to invalidate
 */
export default function useSetReleaseStatus(options = {}) {
  const queryClient = useQueryClient();
  const [missingFields, setMissingFields] = useState([]);

  const mutation = useMutation({
    mutationFn: async ({ targetType, targetId, release }) => {
      const res = await base44.functions.invoke('setReleaseStatusSecure', {
        targetType,
        targetId,
        release,
      });
      return res?.data ?? res;
    },
    onSuccess: async (response) => {
      setMissingFields([]);
      // AKTIV auf frische Server-Daten warten (nicht nur invalidieren), damit
      // der aufrufende Button erst dann umschaltet, wenn die DB-Freigabe
      // garantiert übernommen wurde. Der `isPending`-Status bleibt während
      // dieses Refetchs aktiv, sodass die UI gesperrt bleiben kann.
      const keys = options.invalidateKeys || [];
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['workspace'] }),
        queryClient.refetchQueries({ queryKey: ['workspace-data'] }),
        queryClient.refetchQueries({ queryKey: ['lernpakete'] }),
        queryClient.refetchQueries({ queryKey: ['einheit'] }),
        queryClient.refetchQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] }),
        queryClient.refetchQueries({ queryKey: ['masterAufgaben'] }),
        ...keys.map((k) => queryClient.refetchQueries({ queryKey: Array.isArray(k) ? k : [k] })),
      ]);
      if (options.onSuccess) options.onSuccess(response);
    },
    onError: (err) => {
      // Server liefert bei 422 eine missingFields-Liste mit.
      const data = err?.response?.data || err?.data || {};
      const code = data?.code;
      const fields = Array.isArray(data?.missingFields) ? data.missingFields : [];
      setMissingFields(fields);

      const msg = (() => {
        if (code === 'NOT_COMPLETE') {
          return `Freigabe abgelehnt: ${fields.length} Pflichtfeld(er) fehlen.`;
        }
        if (code === 'CHILDREN_NOT_RELEASED') {
          return `Freigabe abgelehnt: ${fields.length} untergeordnete Aktivität(en) nicht freigegeben.`;
        }
        if (code === 'EINHEIT_FINAL_LOCKED') {
          return 'Einheit ist final freigegeben — Änderung am Freigabe-Status nicht möglich.';
        }
        if (code === 'PARENT_LERNPAKET_RELEASED') {
          return 'Parent-Lernpaket ist freigegeben — bitte erst dort die Freigabe zurücknehmen.';
        }
        if (code === 'DASHBOARD_LOCKED') {
          return 'Lernpaket liegt in einem freigegebenen Dashboard — bitte erst das Dashboard entsperren.';
        }
        return data?.error || err?.message || 'Freigabe-Aktion fehlgeschlagen.';
      })();
      toast.error(msg);
      if (options.onError) options.onError(err, { code, missingFields: fields });
    },
  });

  return {
    setReleaseStatus: mutation.mutate,
    setReleaseStatusAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    missingFields,
    reset: () => {
      setMissingFields([]);
      mutation.reset();
    },
  };
}