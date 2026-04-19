import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/services/AuthService';
import { getBenutzerByEmail, getSystemeinstellungen } from '@/services/BenutzerService';
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
    queryFn: () => getCurrentUser(),
    staleTime: 30 * 1000,           // ✅ 30s statt 5min – aggressivere Cache-Invalidierung
    refetchOnWindowFocus: true,      // ✅ Bei Tab-Wechsel neu abrufen
    refetchOnReconnect: true,        // ✅ Bei Netzwerk-Reconnect neu abrufen
  });

  const { data: benutzerProfile = [], isLoading } = useQuery({
    queryKey: ['benutzerProfil', authUser?.email],
    queryFn: () => getBenutzerByEmail(authUser?.email),
    enabled: !!authUser?.email,
    staleTime: 30 * 1000,            // ✅ 30s statt 5min – aggressivere Cache-Invalidierung
    refetchOnWindowFocus: true,      // ✅ Bei Tab-Wechsel neu abrufen
    refetchOnReconnect: true,        // ✅ Bei Netzwerk-Reconnect neu abrufen
  });

  const profil     = benutzerProfile[0] || null;
  // Base44-Admins sind automatisch Administrator – auch ohne DB-Profil-Eintrag
  const realRolle  = (authUser?.role === 'Administrator' || authUser?.role === 'admin') ? ROLLEN.ADMIN : (profil?.rolle || ROLLEN.BETRACHTER);
  const realFaecher = profil?.fachbereich_zustaendigkeit || [];
  
  // ✅ PHASE 1 DEBUG: Benutzerprofil mit Fächern
  console.log('🔍 PHASE 1 - useRBAC: Benutzerprofil geladen:', {
    email: authUser?.email,
    rolle: realRolle,
    faecher: realFaecher,
    faecher_typ: Array.isArray(realFaecher) ? 'ARRAY ✓' : 'NICHT ARRAY ✗',
    profil_roh: profil,
  });

  // ── Impersonation: mockedRole überschreibt immer die echte Rolle ─────────
  const istEchterAdmin = realRolle === ROLLEN.ADMIN;
  const aktiveRolle = mockedRole ?? realRolle;
  const aktiveFaecher = mockedRole
    ? (DUMMY_FAECHER_FUER_MOCKED_ROLLE[mockedRole] ?? realFaecher)
    : realFaecher;

  // ── Wartungsmodus: Schreibrechte für non-Admins sperren ──────────────────
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => getSystemeinstellungen(),
    staleTime: 0,           // immer frisch prüfen – kritisch für Wartungsmodus
    refetchInterval: 15000, // alle 15s im Hintergrund pollen
  });
  const wartungsmodus = systemSettings.find(s => s.schluessel === 'wartungsmodus')?.wert_boolean === true;
  const schreibgesperrt = wartungsmodus && realRolle !== ROLLEN.ADMIN && authUser?.role !== 'admin';

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
    isMocked:   !!mockedRole,
    wartungsmodus,
    permissions,
  };
}