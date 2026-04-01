import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';
import { useEinheitenListInfinite } from '@/hooks/useEinheitenListInfinite';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Clock, Users, BookOpen, Puzzle, Loader2 } from 'lucide-react';
import EinheitForm from '@/components/einheiten/EinheitForm';
import { toast } from 'sonner';
import { formatDistanceToNow, subWeeks, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import { ROLLEN } from '@/lib/rbac';

const fachColors = {
  Deutsch: 'bg-blue-100 text-blue-700', Mathematik: 'bg-red-100 text-red-700',
  Englisch: 'bg-green-100 text-green-700', Biologie: 'bg-emerald-100 text-emerald-700',
  Chemie: 'bg-orange-100 text-orange-700', Physik: 'bg-violet-100 text-violet-700',
  Geschichte: 'bg-amber-100 text-amber-700', Informatik: 'bg-cyan-100 text-cyan-700',
};

export default function Dashboard() {
  const { permissions, rolle, authUser } = useRBAC();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { einheiten, hasNextPage, fetchNextPage, isFetchingNextPage, isPending } =
    useEinheitenListInfinite(15);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const createEinheit = useMutation({
    mutationFn: async (data) => {
      const einheit = await base44.entities.Einheiten.create(data);
      if (einheit?.id && authUser?.email) {
        await base44.entities.EinheitMembers.create({
          einheit_id: einheit.id,
          user_email: authUser.email,
          user_name: authUser.full_name || authUser.email,
          unit_role: 'LEITUNG',
        });
      }
      return einheit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      setShowForm(false);
      toast.success('Einheit erstellt');
    },
  });

  // Alle geladenen Einheiten sind bereits sortiert nach updated_date vom Backend
  const recentEinheiten = einheiten;

  // Mock online users (würde durch echtes Presence-Tracking ersetzt)
  const onlineUsers = allUsers.slice(0, 3).map(u => ({
    email: u.email,
    full_name: u.full_name,
  }));

  const isAdmin = rolle === ROLLEN.ADMIN;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Willkommen im PoolPlaner</h1>
          <p className="text-muted-foreground mt-1">Aktuelle Aktivitäten und Online-Status</p>
        </div>
        {permissions.kannSchreiben && (
          <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />Neue Einheit
          </Button>
        )}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EinheitForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createEinheit.mutate(data)}
      />
    </div>
  );
}