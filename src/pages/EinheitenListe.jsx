import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { kannEinheitSehen } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, AlertCircle, Wand2 } from 'lucide-react';
import SyncStatusBadge from '@/components/sync/SyncStatusBadge';
import EinheitCard from '@/components/einheiten/EinheitCard';
import EmptyState from '@/components/shared/EmptyState';
import DeletionOverlay from '@/components/loading/DeletionOverlay';
import EntwurfSektion from '@/components/einheiten/EntwurfSektion';
import { BookOpen } from 'lucide-react';
import { getExportPendingCount } from '@/lib/deltaExportLogic';
import { useNavigate } from 'react-router-dom';
import HelpBadge from '@/components/ui/HelpBadge';

function SchnellErstellenModal({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ titel_der_einheit: '', fach: '', jahrgangsstufe: '' });
  const { permissions, faecher: userFaecher } = useRBAC();

  // ✅ SCHRITT 3: Lade NUR die Fächer des Users (Security-Fix)
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookup-faecher'],
    queryFn: async () => {
      const all = await base44.entities.LookupFaecher.list();
      const activeFaecher = all.filter(f => f.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
      
      // Admin/Fachschaft sieht alle Fächer, Lehrkraft nur ihre eigenen
      if (permissions.istAdmin) {
        return activeFaecher;
      }
      // Filtere auf User-Fächer (fallback: alle wenn keine Fächer zugewiesen)
      return userFaecher.length > 0 
        ? activeFaecher.filter(f => userFaecher.includes(f.name))
        : activeFaecher;
    },
    enabled: open,
  });

  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookup-jahrgaenge'],
    queryFn: async () => {
      const all = await base44.entities.LookupJahrgaenge.list();
      return all.filter(j => j.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Einheiten.create(data),
    onSuccess: (einheit) => {
      setForm({ titel_der_einheit: '', fach: '', jahrgangsstufe: '' });
      onOpenChange(false);
      onCreated(einheit);
    },
  });

  const isValid = form.titel_der_einheit.trim() && form.fach && form.jahrgangsstufe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Einheit erstellen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Titel der Einheit *</Label>
            <Input
              placeholder="z.B. Quadratische Gleichungen"
              value={form.titel_der_einheit}
              onChange={e => setForm({ ...form, titel_der_einheit: e.target.value })}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Unterrichtsfach *</Label>
            <Select value={form.fach} onValueChange={v => setForm({ ...form, fach: v })}>
              <SelectTrigger><SelectValue placeholder="Fach auswählen..." /></SelectTrigger>
              <SelectContent>
                {faecher.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jahrgangsstufe *</Label>
            <Select value={form.jahrgangsstufe} onValueChange={v => setForm({ ...form, jahrgangsstufe: v })}>
              <SelectTrigger><SelectValue placeholder="Jahrgang auswählen..." /></SelectTrigger>
              <SelectContent>
                {jahrgaenge.map(j => <SelectItem key={j.id} value={j.bezeichnung}>{j.bezeichnung}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!isValid || createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EinheitenListe() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFach, setFilterFach] = useState('all');
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);
  const [schnellErstellen, setSchnellErstellen] = useState(false);
  const [isDeletingAny, setIsDeletingAny] = useState(false);
  const queryClient = useQueryClient();

  // Reset Overlay falls es hängen bleibt (z.B. nach Einheitenliste-Refresh)
  useEffect(() => {
    if (isDeletingAny) {
      const timeout = setTimeout(() => setIsDeletingAny(false), 15000);
      return () => clearTimeout(timeout);
    }
  }, [isDeletingAny]);
  const { permissions, rolle, faecher: meineFaecher } = useRBAC();
  
  // ✅ SCHRITT 2: Secure Backend-Funktion statt Client-Side Filtering
  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: async () => {
      // Secure Backend-Funktion mit Server-Side RBAC-Filterung
      const response = await base44.functions.invoke('getEinheitenListSecure', {
        page: 1,
        limit: 100, // Hole alle für Pagination im Frontend
      });
      return response.data?.data || [];
    },
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const pendingCount = getExportPendingCount(einheiten);

  // ✅ SCHRITT 2: Backend hat bereits nach Fächern gefiltert - nur noch Search/Changed-Filter
  const filtered = einheiten.filter(e => {
    const matchSearch = e.titel_der_einheit?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFach = filterFach === 'all' || e.fach === filterFach;
    const matchRBAC = kannEinheitSehen(rolle, e.freigabe_status);
    const matchChanged = !showOnlyChanged || (e.sync_status === 'modified' || e.sync_status === 'new' || !e.last_synced_at);
    
    // ✅ KEIN matchMeinFach mehr - Backend hat bereits nach Fächern gefiltert!
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Einheiten
            <HelpBadge
              text="Eine Einheit ist das Grundgerüst Ihrer Unterrichtsplanung. Jede Einheit enthält Themenfelder, Lernpakete und Aufgaben."
              docsSlug="einheiten-struktur"
            />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{einheiten.length} Einheit{einheiten.length !== 1 ? 'en' : ''} insgesamt</p>
        </div>
        {permissions.kannEinheitVerwalten && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" onClick={() => setSchnellErstellen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Neue Einheit
              </Button>
              <HelpBadge
                text="Schnell eine neue Einheit anlegen: Nur Titel, Fach und Jahrgang erforderlich. Themenfelder und Inhalte können Sie später im Workspace ergänzen."
                docsSlug="einheiten-struktur"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button onClick={() => navigate('/einheit/create')} className="gap-2">
                <Wand2 className="w-4 h-4" />
                Neue Einheit (Wizard)
              </Button>
              <HelpBadge
                text="Der geführte Wizard hilft Ihnen Schritt für Schritt: Metadaten, Gesamtziele, Themenfelder und Lernpakete werden strukturiert angelegt. Empfohlen für neue Einheiten."
                docsSlug="einheiten-struktur"
              />
            </div>
          </div>
        )}
      </div>

      {/* Angefangene Entwürfe (nur für den Ersteller sichtbar) */}
      <EntwurfSektion />

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
              onDeleteStart={() => setIsDeletingAny(true)}
              onDeleteEnd={() => setIsDeletingAny(false)}
            />
          ))}
        </div>
      ) : einheiten.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Noch keine Einheiten"
          description="Erstellen Sie Ihre erste Unterrichtseinheit, um mit der Planung zu beginnen."
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-10">Keine Einheiten gefunden.</p>
      )}

      <SchnellErstellenModal
        open={schnellErstellen}
        onOpenChange={setSchnellErstellen}
        onCreated={(einheit) => {
          queryClient.invalidateQueries({ queryKey: ['einheiten'] });
          navigate(`/einheiten/${einheit.id}`);
        }}
      />

      {/* Globales Lösch-Overlay */}
      <DeletionOverlay isVisible={isDeletingAny} message="Einheit wird unwiderruflich gelöscht... Bitte warten." />
    </div>
  );
}