import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Hook für sichere Cascade-Deletes mit rekursivem Löschen abhängiger Daten
 */
export function useCascadeDelete() {
  const queryClient = useQueryClient();

  // Löschen einer Einheit mit allen abhängigen Daten
  const deleteEinheitKaskadierend = useMutation({
    mutationFn: async (einheitId) => {
      const themenfelder = await base44.entities.Themenfeld.filter({ einheit_id: einheitId });
      const lernpakete = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });

      // Lösche alle Themenfelder und deren Pakete
      for (const tf of themenfelder) {
        await deleteThemenfeldKaskadierend(tf.id);
      }

      // Lösche alle nicht zugeordneten Pakete
      for (const paket of lernpakete.filter(p => !p.themenfeld_id)) {
        await deleteLernpaketKaskadierend(paket.id);
      }

      // Lösche die Einheit
      await base44.entities.Einheiten.delete(einheitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      toast.success('Einheit und alle abhängigen Daten gelöscht');
    },
    onError: (error) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });

  // Löschen eines Themenfelds mit allen Paketen
  const deleteThemenfeldKaskadierend = async (themenfeldId) => {
    const lernpakete = await base44.entities.Lernpakete.filter({ themenfeld_id: themenfeldId });
    for (const paket of lernpakete) {
      await deleteLernpaketKaskadierend(paket.id);
    }
    await base44.entities.Themenfeld.delete(themenfeldId);
  };

  // Löschen eines Lernpakets mit allen Zielen und Aufgaben
  const deleteLernpaketKaskadierend = async (paketId) => {
    const lernziele = await base44.entities.Lernziele.filter({ lernpaket_id: paketId });
    const aufgaben = await base44.entities.Aufgabenbausteine.filter({ lernpaket_id: paketId });
    const mappings = await base44.entities.MappingAufgabeBasisziel.list();

    // Lösche Lernziele und ihre Mappings
    for (const lz of lernziele) {
      const relevanteMappings = mappings.filter(m => m.basisziel_id === lz.id);
      for (const m of relevanteMappings) {
        await base44.entities.MappingAufgabeBasisziel.delete(m.id);
      }
      await base44.entities.Lernziele.delete(lz.id);
    }

    // Lösche Aufgaben
    for (const aufgabe of aufgaben) {
      await base44.entities.Aufgabenbausteine.delete(aufgabe.id);
    }

    // Lösche Lernpaket-Aktivitäten
    const paketActivities = await base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: paketId });
    for (const activity of paketActivities) {
      await base44.entities.LernpaketPhaseAktivitaet.delete(activity.id);
    }

    // Lösche das Paket
    await base44.entities.Lernpakete.delete(paketId);
  };

  // Löschen eines Lernziels mit seinen Mappings
  const deleteLernzielKaskadierend = useMutation({
    mutationFn: async (lernzielId) => {
      const mappings = await base44.entities.AllgemeineAufgabeLernzielMapping.filter({
        lernziel_id: lernzielId,
      });
      for (const m of mappings) {
        await base44.entities.AllgemeineAufgabeLernzielMapping.delete(m.id);
      }
      await base44.entities.Lernziele.delete(lernzielId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgabeMappings'] });
      toast.success('Lernziel gelöscht');
    },
    onError: (error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });

  return {
    deleteEinheitKaskadierend: (id) => deleteEinheitKaskadierend.mutate(id),
    deleteLernpaketKaskadierend: async (id) => {
      try {
        await deleteLernpaketKaskadierend(id);
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
        queryClient.invalidateQueries({ queryKey: ['lernziele'] });
        queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
        toast.success('Lernpaket und alle abhängigen Daten gelöscht');
      } catch (error) {
        toast.error(`Fehler: ${error.message}`);
      }
    },
    deleteLernzielKaskadierend: (id) => deleteLernzielKaskadierend.mutate(id),
    isDeleting: deleteEinheitKaskadierend.isPending || deleteLernzielKaskadierend.isPending,
  };
}