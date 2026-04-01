import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook für sanitierte Daten-Queries
 * Entfernt "verwaiste" Einträge, deren Referenzen nicht mehr existieren
 */
export function useSanitizedLernziele(lernpaketIds = []) {
  return useQuery({
    queryKey: ['lernziele-sanitized', lernpaketIds],
    queryFn: async () => {
      if (lernpaketIds.length === 0) return [];
      
      const alleLernziele = await base44.entities.Lernziele.list();
      const lernpakete = await base44.entities.Lernpakete.list();
      const paketIdSet = new Set(lernpakete.map(p => p.id));

      // Filtere nur Ziele, deren Pakete noch existieren
      const validZiele = alleLernziele.filter(lz => 
        lernpaketIds.includes(lz.lernpaket_id) && paketIdSet.has(lz.lernpaket_id)
      );

      // Optional: Markiere verwaiste Ziele für Admin-Bericht
      const orphanedZiele = alleLernziele.filter(lz => !paketIdSet.has(lz.lernpaket_id));
      if (orphanedZiele.length > 0) {
        console.warn(`⚠️ ${orphanedZiele.length} verwaiste Lernziele gefunden:`, orphanedZiele);
      }

      return validZiele;
    },
    enabled: lernpaketIds.length > 0,
  });
}

/**
 * Hook für sanitierte Aufgaben-Queries
 */
export function useSanitizedAufgaben(lernpaketIds = []) {
  return useQuery({
    queryKey: ['aufgaben-sanitized', lernpaketIds],
    queryFn: async () => {
      if (lernpaketIds.length === 0) return [];
      
      const alleAufgaben = await base44.entities.Aufgabenbausteine.list();
      const lernpakete = await base44.entities.Lernpakete.list();
      const paketIdSet = new Set(lernpakete.map(p => p.id));

      // Filtere nur Aufgaben, deren Pakete noch existieren
      const validAufgaben = alleAufgaben.filter(a => 
        lernpaketIds.includes(a.lernpaket_id) && paketIdSet.has(a.lernpaket_id)
      );

      const orphanedAufgaben = alleAufgaben.filter(a => !paketIdSet.has(a.lernpaket_id));
      if (orphanedAufgaben.length > 0) {
        console.warn(`⚠️ ${orphanedAufgaben.length} verwaiste Aufgaben gefunden:`, orphanedAufgaben);
      }

      return validAufgaben;
    },
    enabled: lernpaketIds.length > 0,
  });
}