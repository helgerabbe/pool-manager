import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Datenzugang des Didaktiker-Assistenten.
 *
 * Alle schreibenden Schritte laufen über die Backend-Funktionen — nie direkt
 * auf die Entities: Der Assistent darf nur über das Freigabe-Tor des
 * Import-Centers in den Datenbestand schreiben, und diese Regel darf die
 * Oberfläche nicht umgehen können.
 */

const daten = (res) => res?.data ?? res ?? {};

function fehlerText(error) {
  return error?.response?.data?.error || error?.message || 'Unbekannter Fehler';
}

export function useDidaktikerSitzungen(email) {
  return useQuery({
    queryKey: ['didaktikerSitzungen', email],
    queryFn: () => base44.entities.DidaktikerSitzung.filter({ besitzer_email: email }, '-updated_date', 50),
    enabled: !!email,
  });
}

export function useDidaktikerSitzung(id) {
  return useQuery({
    queryKey: ['didaktikerSitzung', id],
    queryFn: () => base44.entities.DidaktikerSitzung.get(id),
    enabled: !!id,
  });
}

/** Gemeinsame Grundlage aller Assistenten-Schritte. */
function useSchritt(funktionsName, meldung) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = daten(await base44.functions.invoke(funktionsName, payload));
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      if (res?.sitzung?.id) {
        queryClient.setQueryData(['didaktikerSitzung', res.sitzung.id], res.sitzung);
      }
      queryClient.invalidateQueries({ queryKey: ['didaktikerSitzungen'] });
      if (meldung) toast.success(meldung);
    },
    onError: (error) => toast.error(fehlerText(error)),
  });
}

export function useSitzungAnlegen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (daten) => base44.entities.DidaktikerSitzung.create(daten),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['didaktikerSitzungen'] }),
    onError: (error) => toast.error(fehlerText(error)),
  });
}

export const useRecherche = () => useSchritt('didaktikerRecherche', 'Recherche abgeschlossen.');
export const useStrukturAnlegen = () => useSchritt('didaktikerStrukturAnlegen', 'Einheit mit Struktur angelegt.');
export const useLernpaketPlan = () => useSchritt('didaktikerLernpaketPlan', 'Plan für das Lernpaket steht.');
export const useAktivitaetUebernehmen = () => useSchritt('didaktikerAktivitaetUebernehmen', 'Aufgabe übernommen.');

/** Bauen schreibt nichts — deshalb ohne Cache-Aktualisierung. */
export function useAktivitaetBauen() {
  return useMutation({
    mutationFn: async (payload) => {
      const res = daten(await base44.functions.invoke('didaktikerAktivitaetBauen', payload));
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onError: (error) => toast.error(fehlerText(error)),
  });
}