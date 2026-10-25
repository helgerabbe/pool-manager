import React from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import SchuelerBaustelle from '@/pages/schueler/SchuelerBaustelle';
import LiveMitmachen from '@/pages/LiveMitmachen';

/**
 * Rollen-Weiche nach dem Login: Schüler (role='schueler') sehen nur ihre
 * eigene Seite. Konten mit role='user' werden einmal pro Sitzung gegen die
 * Schüler-Stammdaten abgeglichen (initializeNewUser).
 */
export default function RollenWeiche({ children }) {
  const { user } = useAuth();
  const [rolle, setRolle] = React.useState(user?.role);

  React.useEffect(() => {
    setRolle(user?.role);
    if (user?.role !== 'user' || sessionStorage.getItem('rolle_geprueft')) return;
    sessionStorage.setItem('rolle_geprueft', '1');
    base44.functions.invoke('initializeNewUser', {}).then((res) => setRolle(res.data?.role || user.role));
  }, [user?.id, user?.role]);

  // Schüler: Mitmachen im Präsentationsmodus (Raum-Code), sonst ihre eigene Seite.
  if (rolle === 'schueler') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 min-h-0"><LiveMitmachen /></div>
        <details className="border-t px-4 py-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Mein Bereich</summary><SchuelerBaustelle name={user?.full_name} /></details>
      </div>
    );
  }
  return children;
}