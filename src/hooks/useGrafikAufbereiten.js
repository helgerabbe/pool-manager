import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * Grafik-Assistent: erzeugt zu einer fertigen Aufgabe eine grafisch
 * aufbereitete Fassung (externe KI, siehe base44/functions/grafikAufbereiten).
 * Gespeichert wird nichts — das Ergebnis geht zurück in den Dialog.
 */
export default function useGrafikAufbereiten() {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await base44.functions.invoke('grafikAufbereiten', payload);
      return res.data;
    },
    onError: (err) => {
      const meldung = err?.response?.data?.error || err?.message || 'Die Aufbereitung ist fehlgeschlagen.';
      toast.error(meldung);
    },
  });
}