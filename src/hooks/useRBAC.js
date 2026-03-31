import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPermissions, ROLLEN } from '@/lib/rbac';

/**
 * Hook: Lädt das Benutzer-Profil und berechnet die Permissions.
 * Gibt ein permissions-Objekt zurück, das direkt in der UI verwendet werden kann.
 */
export function useRBAC() {
  const { data: authUser } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: benutzerProfile = [], isLoading } = useQuery({
    queryKey: ['benutzerProfil', authUser?.email],
    queryFn: () => base44.entities.Benutzer.filter({ user_id: authUser?.email }),
    enabled: !!authUser?.email,
    staleTime: 5 * 60 * 1000,
  });

  const profil = benutzerProfile[0] || null;
  const rolle = profil?.rolle || ROLLEN.BETRACHTER;
  const faecher = profil?.fachbereich_zustaendigkeit || [];

  return {
    isLoading,
    authUser,
    profil,
    rolle,
    faecher,
    permissions: getPermissions(rolle, faecher),
  };
}