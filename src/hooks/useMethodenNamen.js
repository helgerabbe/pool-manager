import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/** Namen aller Methoden aus dem Methodenkatalog. */
export default function useMethodenNamen() {
  const { data = [] } = useQuery({
    queryKey: ['methodenNamen'],
    queryFn: async () => (await base44.entities.MethodenKatalog.filter({ quelle: 'methode' })).map((m) => m.name),
    staleTime: 600000,
  });
  return data;
}