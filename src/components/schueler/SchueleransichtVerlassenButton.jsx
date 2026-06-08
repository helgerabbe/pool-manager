import { useNavigate } from 'react-router-dom';
import { LogOut, DoorOpen } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { logout } from '@/services/AuthService';

/**
 * Schwebender Button in der Schüleransicht (oben rechts).
 *
 * - Für Lehrkräfte/Admins (kein Schüler): „Schüleransicht verlassen" → zurück
 *   zum normalen Dashboard. So testen sie die Schüleransicht in voller Höhe.
 * - Für echte Schüler: „Abmelden" → Logout aus der App.
 *
 * Hinweis: Da es aktuell noch keine eigene Schüler-Rolle gibt, gilt jede:r
 * mit Betrachter-Rolle (oder niedriger) als „Schüler" im Sinne dieses Buttons.
 * Wird die Schüler-Rolle später eingeführt, muss hier nur `istSchueler`
 * angepasst werden.
 */
export default function SchueleransichtVerlassenButton() {
  const navigate = useNavigate();
  const { realRolle } = useRBAC();

  // Alle echten Mitarbeiter-Rollen dürfen die Ansicht verlassen.
  const istMitarbeiter = [
    ROLLEN.ADMIN,
    ROLLEN.FACHSCHAFT,
    ROLLEN.LEHRKRAFT,
    ROLLEN.MOODLE,
  ].includes(realRolle);

  const handleClick = () => {
    if (istMitarbeiter) {
      navigate('/');
    } else {
      logout(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-md px-4 py-2 text-sm font-medium text-muted-foreground shadow-md hover:text-foreground hover:border-primary/40 hover:shadow-lg transition-all"
    >
      {istMitarbeiter ? (
        <>
          <DoorOpen className="w-4 h-4" />
          Schüleransicht verlassen
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" />
          Abmelden
        </>
      )}
    </button>
  );
}