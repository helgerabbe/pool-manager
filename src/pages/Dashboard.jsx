import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, GraduationCap } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { TutorialSlideshowDialog } from '@/components/onboarding/TutorialSlideshow';

export default function Dashboard() {
  const { onlineUsers } = usePresence('dashboard');
  const [tutorialOpen, setTutorialOpen] = useState(false);

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
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {/* Titelbild */}
        <div className="rounded-2xl overflow-hidden shadow-md w-full md:w-2/3 shrink-0">
          <img
            src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/996944c1f_image.png"
            alt="Pool-Manager – Die Orga-App für Freiarbeitszeiten"
            className="w-full h-full object-cover"
            style={{ maxHeight: '480px' }}
          />
        </div>

        {/* Online-Nutzer */}
        <Card className="border-0 shadow-sm flex-1 min-w-0">
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

      {/* Dezenter Tutorial-Neustart-Button */}
      <button
        onClick={() => setTutorialOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
          <GraduationCap className="w-3.5 h-3.5" />
        </div>
        Onboarding-Tutorial erneut ansehen
      </button>

      {tutorialOpen && (
        <TutorialSlideshowDialog open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      )}
    </div>
  );
}