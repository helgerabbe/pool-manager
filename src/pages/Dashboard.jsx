import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Layers, Target, Puzzle, ArrowRight, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });
  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });
  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
  });

  const stats = [
    { label: 'Einheiten', value: einheiten.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { label: 'Lernpakete', value: lernpakete.length, icon: Layers, color: 'bg-accent/10 text-accent' },
    { label: 'Lernziele', value: lernziele.length, icon: Target, color: 'bg-green-100 text-green-700' },
    { label: 'Aufgabenbausteine', value: aufgaben.length, icon: Puzzle, color: 'bg-purple-100 text-purple-700' },
  ];

  const freigegebene = einheiten.filter(e => e.freigabe_status === 'Freigegeben für Moodle').length;
  const inPlanung = einheiten.filter(e => e.freigabe_status !== 'Freigegeben für Moodle').length;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Willkommen im PoolPlaner</h1>
        <p className="text-muted-foreground mt-2 text-lg">Ihre Meta-Planungsebene für selbstgesteuerte Poolzeiten.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Freigabestatus</h2>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">In Planung</span>
                <span className="text-sm font-semibold">{inPlanung}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-accent h-2 rounded-full transition-all" 
                  style={{ width: einheiten.length > 0 ? `${(inPlanung / einheiten.length) * 100}%` : '0%' }} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Freigegeben für Moodle</span>
                <span className="text-sm font-semibold">{freigegebene}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: einheiten.length > 0 ? `${(freigegebene / einheiten.length) * 100}%` : '0%' }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Neueste Einheiten</h2>
              <Link to="/einheiten" className="text-xs text-primary hover:underline flex items-center gap-1">
                Alle anzeigen <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {einheiten.slice(0, 4).map(e => (
                <Link 
                  key={e.id} 
                  to={`/einheiten/${e.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{e.titel_der_einheit}</p>
                    <p className="text-xs text-muted-foreground">{e.fach} · Jg. {e.jahrgangsstufe}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
              {einheiten.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Noch keine Einheiten erstellt.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}