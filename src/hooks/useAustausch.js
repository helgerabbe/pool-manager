/**
 * hooks/useAustausch.js
 *
 * Posteingang des gemeinsamen Briefkastens `austausch/` im Repository.
 * Gelesen wird live aus dem Repository (die Dateien sind die Wahrheit),
 * geantwortet wird ausschließlich über die geprüfte Backend-Funktion.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const KEY = ['austauschNachrichten'];

export function useAustauschNachrichten() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await base44.functions.invoke('listAustauschNachrichten', {});
      return res.data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * „Einmal lesen": Der Pool-Manager arbeitet die offenen Nachrichten des
 * Kursbaus selbst durch — beantwortet, hakt ab oder legt sie zur Sichtung.
 */
export function useAustauschDurcharbeiten() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('austauschDurcharbeiten', {});
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      if (!data?.gelesen) {
        toast.success('Keine offene Nachricht — nichts zu tun.');
      } else {
        toast.success(
          `${data.gelesen} gelesen: ${data.beantwortet} beantwortet, ${data.erledigt} abgehakt, ${data.sichtung} zur Sichtung.`,
        );
      }
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message),
  });
}

/**
 * Status einer einzelnen Nachricht von Hand setzen — für Nachrichten, die
 * bereits auf anderem Weg beantwortet wurden oder die die Fachgruppe bewusst
 * nicht weiterverfolgt.
 */
export function useAustauschStatusSetzen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ datei, status, notiz }) => {
      const res = await base44.functions.invoke('austauschStatusSetzen', { datei, status, notiz });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Die Nachricht liegt jetzt im Verlauf.');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message),
  });
}

export function useAustauschAntworten() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await base44.functions.invoke('pushAustauschAntwort', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(`Nachricht abgelegt: ${data?.datei}`);
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message),
  });
}