import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { kannEinheitSehen } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, AlertCircle, Wand2 } from 'lucide-react';
import SyncStatusBadge from '@/components/sync/SyncStatusBadge';
import EinheitCard from '@/components/einheiten/EinheitCard';
import EmptyState from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import { getExportPendingCount } from '@/lib/deltaExportLogic';
import { useNavigate } from 'react-router-dom';

export default function EinheitenListe() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFach, setFilterFach] = useState('all');
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const queryClient = useQueryClient();
  const { permissions, rolle } = useRBAC();

  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const pendingCount = getExportPendingCount(einheiten);

  const filtered = einheiten.filter(e => {
    const matchSearch = e.titel_der_einheit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFach = filterFach === 'all' || e.fach === filterFach;
    const matchRBAC = kannEinheitSehen(rolle, e.freigabe_status);
    const matchChanged = !showOnlyChanged || (e.sync_status === 'modified' || e.sync_status === 'new' || !e.last_synced_at);
    return matchSearch && matchFach && matchRBAC && matchChanged;
  });

  const faecher = [...new Set(einheiten.map(e => e.fach).filter(Boolean))];

  const getLernpaketCount = (einheitId) => lernpakete.filter(lp => lp.einheit_id === einheitId).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Einheiten</h1>
          <p className="text-sm text-muted-foreground mt-1">{einheiten.length} Einheit{einheiten.length !== 1 ? 'en' : ''} insgesamt</p>
        </div>
        {permissions.kannSchreiben && (
          <Button onClick={() => navigate('/einheit/create')} className="gap-2">
            <Wand2 className="w-4 h-4" />
            Neue Einheit (Wizard)
          </Button>
        )}
      </div>

      {einheiten.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Einheiten durchsuchen..."
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
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  showOnlyChanged
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                {pendingCount} ausstehend
              </button>
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(einheit => (
            <EinheitCard 
              key={einheit.id} 
              einheit={einheit} 
              lernpaketCount={getLernpaketCount(einheit.id)}
              rolle={rolle}
            />
          ))}
        </div>
      ) : einheiten.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Noch keine Einheiten"
          description="Erstellen Sie Ihre erste Unterrichtseinheit, um mit der Planung zu beginnen."
          actionLabel="Erste Einheit erstellen"
          onAction={() => navigate('/einheit/create')}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">Keine Einheiten gefunden.</p>
      )}

    </div>
  );
}