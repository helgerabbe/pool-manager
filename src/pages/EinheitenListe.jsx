import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { kannEinheitSehen } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import EinheitCard from '@/components/einheiten/EinheitCard';
import EinheitForm from '@/components/einheiten/EinheitForm';
import EmptyState from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';

export default function EinheitenListe() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFach, setFilterFach] = useState('all');
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Einheiten.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheiten'] }),
  });

  const filtered = einheiten.filter(e => {
    const matchSearch = e.titel_der_einheit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFach = filterFach === 'all' || e.fach === filterFach;
    const matchRBAC = kannEinheitSehen(rolle, e.freigabe_status);
    return matchSearch && matchFach && matchRBAC;
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
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Neue Einheit
          </Button>
        )}
      </div>

      {einheiten.length > 0 && (
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
      )}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(einheit => (
            <EinheitCard 
              key={einheit.id} 
              einheit={einheit} 
              lernpaketCount={getLernpaketCount(einheit.id)} 
            />
          ))}
        </div>
      ) : einheiten.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Noch keine Einheiten"
          description="Erstellen Sie Ihre erste Unterrichtseinheit, um mit der Planung zu beginnen."
          actionLabel="Erste Einheit erstellen"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">Keine Einheiten gefunden.</p>
      )}

      <EinheitForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
      />
    </div>
  );
}