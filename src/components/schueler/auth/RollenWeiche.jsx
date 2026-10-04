import React from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import SchuelerBaustelle from '@/pages/schueler/SchuelerBaustelle';

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

  if (rolle === 'schueler') return <SchuelerBaustelle name={user?.full_name} />;
  return children;
}