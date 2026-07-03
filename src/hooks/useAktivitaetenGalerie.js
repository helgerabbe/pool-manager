import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Lädt das Galerie-Manifest (aktivitaeten.json) über die Backend-Function
 * getAktivitaetenGalerie. Liefert { version, stand, aktivitaeten }.
 */
export default function useAktivitaetenGalerie(enabled = true) {
  return useQuery({
    queryKey: ['aktivitaetenGalerie'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getAktivitaetenGalerie', { mode: 'list' });
      if (res?.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}