/**
 * useLerntypDefinitionen
 * ────────────────────────────────────────────────────────────────────
 * Liefert die vier Lerntypen mit schulweit editierbaren Anzeigenamen/
 * Untertiteln (Admin-Verwaltung → Dashboards). DB-Overrides aus der
 * LerntypDefinition-Entity werden über die Hardcode-Defaults aus
 * src/lib/lerntypen.js gelegt; fehlt ein Datensatz, gilt der Default.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { LERNTYPEN } from '@/lib/lerntypen';

export function useLerntypDefinitionen() {
  const { data: defs = [] } = useQuery({
    queryKey: ['lerntypDefinitionen'],
    queryFn: () => base44.entities.LerntypDefinition.list(),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const byKey = new Map(defs.map((d) => [d.schluessel, d]));
    const lerntypen = LERNTYPEN.map((lt) => {
      const o = byKey.get(lt.key);
      return {
        ...lt,
        name: o?.anzeigename?.trim() || lt.name,
        untertitel: o?.untertitel?.trim() || lt.untertitel,
      };
    });
    const labelByKey = Object.fromEntries(lerntypen.map((l) => [l.key, l.name]));
    return { lerntypen, labelByKey };
  }, [defs]);
}