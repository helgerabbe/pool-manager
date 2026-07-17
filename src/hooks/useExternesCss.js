import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { isSupabase } from '@/services/schueler/backend';

/**
 * Lädt das zentrale, externe CSS aus dem GitHub-CSS-Connector
 * (Systemeinstellungen → Integrationen). Gecacht für 5 Minuten.
 *
 * Rückgabe: { enabled, css }
 *  - enabled=false, wenn der Connector fehlt, unvollständig oder deaktiviert ist
 *    (dann gilt das lokale Pool-Manager-Layout).
 *
 * Im reinen Supabase-Schüler-Build (GitHub Pages) stehen keine
 * Base44-Funktionen zur Verfügung — dort ist der Hook inaktiv.
 */
export default function useExternesCss() {
  const { data, refetch } = useQuery({
    queryKey: ['externes-css'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getExternesCss', {});
      return res.data;
    },
    enabled: !isSupabase(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    enabled: !!data?.enabled && !!data?.css,
    css: data?.css || '',
    refetch,
  };
}