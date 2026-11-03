import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** Alles, was die App zu einer Unterrichtseinheit weiß: Planung, Lerngruppe, Fachregister, Tagebuch. */
export default function useEinheitWissen(einheitId) {
  return useQuery({
    queryKey: ['einheitWissen', einheitId],
    enabled: !!einheitId,
    queryFn: async () => {
      const einheit = await base44.entities.Unterrichtseinheit.get(einheitId);
      const [planungen, lerngruppe, fachregister, tagebuch] = await Promise.all([
        base44.entities.UnterrichtsPlanung.filter({ unterrichtseinheit_id: einheitId }),
        einheit.lerngruppe_id ? base44.entities.Lerngruppe.get(einheit.lerngruppe_id) : null,
        base44.entities.FachregisterEinheit.filter({ fach: einheit.fach, jahrgangsstufe: einheit.jahrgangsstufe }),
        base44.entities.UnterrichtsTagebuch.filter({ unterrichtseinheit_id: einheitId }, { sort: '-datum', limit: 200 }).then((p) => p.items),
      ]);
      return { einheit, planung: planungen[0] || null, lerngruppe, fachregister, tagebuch };
    },
  });
}