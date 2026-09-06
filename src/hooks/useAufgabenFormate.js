import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Interne Aufgabengalerie.
 *
 * Lädt ALLE Formate (Vorschläge wie freigegebene) — die Trennung passiert in
 * der Anzeige, damit die Administration beides in einem Zug bearbeiten kann.
 * Lehrkraft-Ansichten filtern später auf status='freigegeben'.
 */
export function useAufgabenFormate() {
  const qc = useQueryClient();

  const { data: formate = [], isLoading } = useQuery({
    queryKey: ['aufgabenFormate'],
    queryFn: () => base44.entities.AufgabenFormat.list('-created_date', 200),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['aufgabenFormate'] });

  const speichern = useMutation({
    mutationFn: ({ id, ...felder }) => base44.entities.AufgabenFormat.update(id, felder),
    onSuccess: invalidate,
  });

  const anlegen = useMutation({
    mutationFn: (felder) => base44.entities.AufgabenFormat.create(felder),
    onSuccess: invalidate,
  });

  const loeschen = useMutation({
    mutationFn: (id) => base44.entities.AufgabenFormat.delete(id),
    onSuccess: invalidate,
  });

  return {
    formate,
    vorschlaege: formate.filter((f) => f.status !== 'freigegeben'),
    galerie: formate.filter((f) => f.status === 'freigegeben'),
    isLoading,
    speichern,
    anlegen,
    loeschen,
  };
}