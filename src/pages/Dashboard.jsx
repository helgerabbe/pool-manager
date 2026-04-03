import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';


export default function Dashboard() {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Online users mit Rolle
  const onlineUsers = allUsers.slice(0, 3).map(u => ({
    email: u.email,
    full_name: u.full_name,
    role: u.role || 'user',
  }));

  return (
    <div className="space-y-6">
      {/* Hero + Online-Nutzer nebeneinander */}
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
                {onlineUsers.map(user => (
                  <div key={user.email} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{user.full_name || user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.role === 'admin' ? 'Administrator' : 'Nutzer'}
                      </p>
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