import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import TutorialCard from '@/components/onboarding/TutorialSlideshow';

export default function Dashboard() {
  // Globaler Presence-Hook – Heartbeat läuft auch in AppLayout weiter,
  // hier nur für die Dashboard-Anzeige (currentView = 'dashboard')
  const { onlineUsers } = usePresence('dashboard');

  const { data: benutzerList = [] } = useQuery({
    queryKey: ['benutzer-all'],
    queryFn: () => base44.entities.Benutzer.list(),
  });

  const getRolle = (entry) => {
    const b = benutzerList.find(b => b.user_id === entry.user_email);
    return b?.rolle || 'Nutzer';
  };

  return (
    <div className="space-y-6">
      <TutorialCard />

      <div className="flex gap-6 items-stretch">
        {/* Titelbild */}
        <div className="rounded-2xl overflow-hidden shadow-md flex-shrink-0 w-2/3">
          <img
            src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/996944c1f_image.png"
            alt="Pool-Manager – Die Orga-App für Freiarbeitszeiten"
            className="w-full h-full object-cover"
            style={{ maxHeight: '480px' }}
          />
        </div>

        {/* Online-Nutzer */}
        <Card className="border-0 shadow-sm flex-1">
          <CardContent className="p-6 flex flex-col h-full">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              Online-Nutzer ({onlineUsers.length})
            </h2>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Keine Nutzer online</p>
            ) : (
              <div className="space-y-2">
                {onlineUsers.map(entry => (
                  <div key={entry.user_email} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{entry.user_name || entry.user_email}</p>
                      <p className="text-xs text-muted-foreground">{getRolle(entry)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}