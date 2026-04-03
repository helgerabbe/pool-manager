import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';
import { useEinheitenListInfinite } from '@/hooks/useEinheitenListInfinite';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Loader2 } from 'lucide-react';
import { formatDistanceToNow, subWeeks, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';

const fachColors = {
  Deutsch: 'bg-blue-100 text-blue-700', Mathematik: 'bg-red-100 text-red-700',
  Englisch: 'bg-green-100 text-green-700', Biologie: 'bg-emerald-100 text-emerald-700',
  Chemie: 'bg-orange-100 text-orange-700', Physik: 'bg-violet-100 text-violet-700',
  Geschichte: 'bg-amber-100 text-amber-700', Informatik: 'bg-cyan-100 text-cyan-700',
};

export default function Dashboard() {
  const { permissions } = useRBAC();

  const { einheiten, hasNextPage, fetchNextPage, isFetchingNextPage, isPending } =
    useEinheitenListInfinite(15);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter Einheiten der letzten 2 Wochen
  const twoWeeksAgo = subWeeks(new Date(), 2);
  const recentEinheiten = einheiten.filter(einheit => {
    if (!einheit.updated_date) return false;
    return isAfter(new Date(einheit.updated_date), twoWeeksAgo);
  });

  // Online users mit Rolle
  const onlineUsers = allUsers.slice(0, 3).map(u => ({
    email: u.email,
    full_name: u.full_name,
    role: u.role || 'user',
  }));

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden shadow-md relative">
        <img
          src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/996944c1f_image.png"
          alt="Pool-Manager – Die Orga-App für Freiarbeitszeiten"
          className="w-full object-cover max-h-64"
        />
      </div>

      {/* Zuletzt bearbeitete Einheiten */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Zuletzt bearbeitet
            </h2>
          </div>

          {isPending ? (
            <p className="text-sm text-muted-foreground text-center py-6">Lädt Einheiten...</p>
          ) : recentEinheiten.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Keine Einheiten gefunden</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentEinheiten.map(einheit => (
                  <Link key={einheit.id} to={`/einheiten/${einheit.id}`}>
                    <Card className="h-full hover:shadow-md transition-shadow border hover:border-primary/20 group/card">
                      <CardContent className="p-4 h-full flex flex-col">
                        <p className="font-semibold text-sm group-hover/card:text-primary transition-colors line-clamp-2 flex-1">
                          {einheit.titel_der_einheit}
                        </p>
                        <div className="space-y-3 mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <Badge className={`text-[10px] shrink-0 ${fachColors[einheit.fach] || 'bg-muted text-muted-foreground'}`}>
                              {einheit.fach}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Jg. {einheit.jahrgangsstufe}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(einheit.updated_date), { addSuffix: true, locale: de })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* "Mehr laden" Button */}
              {hasNextPage ? (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    className="gap-2"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Lädt...
                      </>
                    ) : (
                      'Weitere Einheiten laden'
                    )}
                  </Button>
                </div>
              ) : recentEinheiten.length > 0 ? (
                <p className="text-xs text-muted-foreground text-center pt-4">
                  Alle Einheiten geladen
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Online Nutzer */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Online-Nutzer ({onlineUsers.length})
            </h2>
          </div>

          {onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Keine Nutzer online</p>
          ) : (
            <div className="space-y-2">
              {onlineUsers.map(user => (
                <div key={user.email} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {user.full_name || user.email}
                    </p>
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
  );
}