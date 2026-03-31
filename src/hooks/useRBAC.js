import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getPermissions, ROLLEN } from '@/lib/rbac';
import { useMockedRole } from '@/lib/RoleContext';

/**
 * Dummy-Fachbereiche für fachgebundene Rollen im Test-Modus.
 * Ermöglicht, dass Filter und RBAC-Prüfungen korrekt greifen.
 */
const DUMMY_FAECHER_FUER_MOCKED_ROLLE = {
  [ROLLEN.FACHSCHAFT]: ['Deutsch'],
  [ROLLEN.LEHRKRAFT]:  ['Deutsch'],
};

/**
 * Hook: Lädt das Benutzer-Profil und berechnet die Permissions.
 *
 * Wenn `mockedRole` gesetzt ist (nur möglich für echte Admins),
 * überschreibt das System die Rolle für alle UI-Berechnungen.
 * Die echte Datenbankrolle bleibt unverändert und ist über
 * `realRolle` abrufbar.
 */
export function useRBAC() {
  const { mockedRole } = useMockedRole();

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

  const profil     = benutzerProfile[0] || null;
  const realRolle  = profil?.rolle || ROLLEN.BETRACHTER;
  const realFaecher = profil?.fachbereich_zustaendigkeit || [];

  // ── Impersonation: nur für echte Admins ──────────────────────────────────
  // Wenn mockedRole gesetzt ist UND der echte Account Admin ist,
  // werden Rolle und Fachbereiche für die gesamte UI überschrieben.
  const istEchterAdmin = realRolle === ROLLEN.ADMIN;
  const aktiveRolle = (istEchterAdmin && mockedRole) ? mockedRole : realRolle;
  const aktiveFaecher = (istEchterAdmin && mockedRole)
    ? (DUMMY_FAECHER_FUER_MOCKED_ROLLE[mockedRole] ?? [])
    : realFaecher;

  // ── Wartungsmodus: Schreibrechte für non-Admins sperren ──────────────────
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => base44.entities.Systemeinstellungen.list(),
    staleTime: 60 * 1000,
  });
  const wartungsmodus = systemSettings.find(s => s.schluessel === 'wartungsmodus')?.wert_boolean === true;
  const schreibgesperrt = wartungsmodus && realRolle !== ROLLEN.ADMIN;

  const basePermissions = getPermissions(aktiveRolle, aktiveFaecher);

  // Im Wartungsmodus werden alle Schreibrechte für non-Admins auf false gesetzt
  const permissions = schreibgesperrt
    ? {
        ...basePermissions,
        kannSchreiben: false,
        kannLoeschen: false,
        kannFreigabeAendern: false,
        kannEinheitBearbeiten: () => false,
        kannFreigabeStatusAendern: () => false,
        wartungsmodus: true,
      }
    : { ...basePermissions, wartungsmodus: false };

  return {
    isLoading,
    authUser,
    profil,
    rolle:      aktiveRolle,
    realRolle,
    faecher:    aktiveFaecher,
    isMocked:   istEchterAdmin && !!mockedRole,
    wartungsmodus,
    permissions,
  };
}