import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Loader2, Play, Smartphone } from 'lucide-react';
import { raumStarten } from '@/lib/liveRaum';

/** Präsentationsmodus: eigene Stunden live mit der Klasse abspielen. */
export default function Praesentationsmodus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [startet, setStartet] = React.useState(null);
  const { data: stunden = [], isLoading } = useQuery({
    queryKey: ['praesentation-stunden', user?.email],
    enabled: !!user?.email,
    queryFn: () => base44.entities.Unterrichtsstunde.filter({ besitzer_email: user.email }, '-updated_date', 100),
  });

  const starten = async (s) => {
    setStartet(s.id);
    const raum = await raumStarten(s, user.email).finally(() => setStartet(null));
    navigate(`/praesentation/${raum.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2"><MonitorPlay className="w-6 h-6 text-primary" /> Präsentationsmodus</h1>
            <p className="text-sm text-muted-foreground mt-1">Starte eine Stunde: An der Tafel erscheint ein Raum-Code, mit dem die Schüler auf ihrem Gerät beitreten.</p>
          </div>
          <Button variant="outline" size="sm" asChild><Link to="/mitmachen"><Smartphone className="w-4 h-4" /> Schüleransicht testen</Link></Button>
        </div>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : stunden.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Noch keine Unterrichtsstunden. Plane zuerst eine Stunde unter „Mein Unterricht“.</p>
        ) : (
          <div className="divide-y rounded-lg border bg-card">
            {stunden.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.arbeitstitel}</p>
                  <p className="text-[11px] text-muted-foreground">{[s.fach, s.jahrgangsstufe && `Jg. ${s.jahrgangsstufe}`, s.status === 'bereit' ? 'bereit' : 'in Planung'].filter(Boolean).join(' · ')}</p>
                </div>
                <Button size="sm" disabled={!!startet} onClick={() => starten(s)}>
                  {startet === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Stunde starten
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}