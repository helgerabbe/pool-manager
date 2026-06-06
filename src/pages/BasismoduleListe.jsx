import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { kannEinheitSehen } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Layers } from 'lucide-react';
import BasismodulCard from '@/components/basismodule/BasismodulCard';
import EmptyState from '@/components/shared/EmptyState';
import DeletionOverlay from '@/components/loading/DeletionOverlay';
import { useNavigate } from 'react-router-dom';
import HelpBadge from '@/components/ui/HelpBadge';
import { useEinheitenMetrics } from '@/hooks/useEinheitenMetrics';

export default function BasismoduleListe() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFach, setFilterFach] = useState('all');
  const [filterJahrgang, setFilterJahrgang] = useState('all');
  const [isDeletingAny, setIsDeletingAny] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isDeletingAny) {
      const timeout = setTimeout(() => setIsDeletingAny(false), 15000);
      return () => clearTimeout(timeout);
    }
  }, [isDeletingAny]);

  const { permissions, rolle, authUser } = useRBAC();

  const { data: basismodule = [], isLoading, isFetching } = useQuery({
    queryKey: ['basismodule'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getEinheitenListSecure', {
        page: 1,
        limit: 100,
        scope: 'basismodule',
      });
      return response.data?.data || [];
    },
    staleTime: 0,
  });

  const isInitialLoading = isLoading || isFetching;

  const { data: jahrgaengeLookup = [] } = useQuery({
    queryKey: ['lookup-jahrgaenge'],
    queryFn: async () => {
      const all = await base44.entities.LookupJahrgaenge.list();
      return all.filter((j) => j.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = basismodule.filter(e => {
    const matchSearch = e.titel_der_einheit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFach = filterFach === 'all' || e.fach === filterFach;
    const matchJahrgang = filterJahrgang === 'all' || String(e.jahrgangsstufe) === String(filterJahrgang);
    const matchRBAC = kannEinheitSehen(rolle, e.freigabe_status);
    return matchSearch && matchFach && matchJahrgang && matchRBAC;
  });

  const faecher = [...new Set(basismodule.map(e => e.fach).filter(Boolean))];
  const { metrics } = useEinheitenMetrics(basismodule.map((e) => e.id));

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Basismodule werden geladen, bitte einen Moment Geduld...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-600" />
            Basismodule
            <HelpBadge text="Basismodule sind Wissensspeicher aus vorangegangenen Jahrgängen – z.B. die Prozentrechnung, auf die spätere Einheiten zurückgreifen. Sie funktionieren wie reguläre Einheiten, werden aber nicht über Dashboards exportiert." />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{basismodule.length} Basismodul{basismodule.length !== 1 ? 'e' : ''} insgesamt</p>
        </div>
        {permissions.kannEinheitVerwalten && (
          <Button variant="outline" onClick={() => navigate('/einheit/create?basismodul=1')} className="gap-2">
            <Plus className="w-4 h-4" />
            Neues Basismodul
          </Button>
        )}
      </div>

      {basismodule.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Basismodule durchsuchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterFach} onValueChange={setFilterFach}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Alle Fächer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Fächer</SelectItem>
              {faecher.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterJahrgang} onValueChange={setFilterJahrgang}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Alle Jahrgänge" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Jahrgänge</SelectItem>
              {jahrgaengeLookup.map(j => (
                <SelectItem key={j.id} value={j.bezeichnung}>Jg. {j.bezeichnung}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(einheit => (
            <BasismodulCard
              key={einheit.id}
              einheit={einheit}
              metrics={metrics[einheit.id]}
              rolle={rolle}
              onDeleteStart={() => setIsDeletingAny(true)}
              onDeleteEnd={() => setIsDeletingAny(false)}
            />
          ))}
        </div>
      ) : basismodule.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Noch keine Basismodule"
          description="Erstellen Sie Ihr erstes Basismodul (z.B. Prozentrechnung), um Grundwissen aus vorangegangenen Jahrgängen abzubilden."
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">Keine Basismodule gefunden.</p>
      )}

      <DeletionOverlay isVisible={isDeletingAny} message="Basismodul wird unwiderruflich gelöscht... Bitte warten." />
    </div>
  );
}