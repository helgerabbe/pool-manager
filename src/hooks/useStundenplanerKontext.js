import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** Lädt die Unterrichtseinheit und ihren geplanten Verlauf (Abschnitte = wählbare Stunden). */
export default function useStundenplanerKontext(id) {
  return useQuery({
    queryKey: ['stundenplanerKontext', id],
    queryFn: async () => {
      const [einheit, planungen] = await Promise.all([
        base44.entities.Unterrichtseinheit.get(id),
        base44.entities.UnterrichtsPlanung.filter({ unterrichtseinheit_id: id }),
      ]);
      return { einheit, verlauf: planungen[0]?.verlauf || [] };
    },
  });
}