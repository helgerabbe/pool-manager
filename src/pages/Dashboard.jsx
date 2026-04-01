import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useRBAC } from '@/hooks/useRBAC';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BookOpen, Layers, Target, Puzzle, ArrowRight,
  TrendingUp, Plus, Search, Filter, Lock, Trash2
} from 'lucide-react';
import EinheitForm from '@/components/einheiten/EinheitForm';
import { UnitRoleBadge } from '@/components/einheiten/EinheitSettingsModal';
import DeleteConfirmModal from '@/components/shared/DeleteConfirmModal';
import { kannEinheitSehen, ROLLEN } from '@/lib/rbac';
import { toast } from 'sonner';

const FAECHER = ["Deutsch","Mathematik","Englisch","Französisch","Latein","Biologie","Chemie","Physik","Geschichte","Geographie","Politik","Wirtschaft","Kunst","Musik","Sport","Religion","Ethik","Informatik"];
const JAHRGANGSSTUFEN = ["5","6","7","8","9","10","11","12","13"];

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
  const [search, setSearch] = useState('');
  const [filterFach, setFilterFach] = useState('all');
  const [filterJahrgang, setFilterJahrgang] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, titel }
  const [isDeleting, setIsDeleting] = useState(false);
  const isAdmin = rolle === ROLLEN.ADMIN;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await base44.functions.invoke('deleteEinheit', { einheitId: deleteTarget.id });
    if (res.data?.success) {
      toast.success('Einheit erfolgreich gelöscht.');
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    } else {
      toast.error('Fehler beim Löschen der Einheit.');
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

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

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['einheit-members-mine', authUser?.email],
    queryFn: () => base44.entities.EinheitMembers.filter({ user_email: authUser?.email }),
    enabled: !!authUser?.email,
  });

  const createEinheit = useMutation({
    mutationFn: async (data) => {
      const einheit = await base44.entities.Einheiten.create(data);
      // Ersteller automatisch als LEITUNG eintragen
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
      queryClient.invalidateQueries({ queryKey: ['einheit-members-mine', authUser?.email] });
    },
  });

  const sichtbareEinheiten = einheiten.filter(e => kannEinheitSehen(rolle, e.freigabe_status));

  const gefilterteEinheiten = sichtbareEinheiten.filter(e => {
    const matchSearch  = !search || e.titel_der_einheit?.toLowerCase().includes(search.toLowerCase()) || e.fach?.toLowerCase().includes(search.toLowerCase());
    const matchFach    = filterFach === 'all' || e.fach === filterFach;
    const matchJg      = filterJahrgang === 'all' || e.jahrgangsstufe === filterJahrgang;
    const matchStatus  = filterStatus === 'all' || e.freigabe_status === filterStatus || (!e.freigabe_status && filterStatus === 'In Planung');
    return matchSearch && matchFach && matchJg && matchStatus;
  });

  const freigegebene = sichtbareEinheiten.filter(e => e.freigabe_status === 'Freigegeben für Moodle').length;
  const inPlanung    = sichtbareEinheiten.filter(e => e.freigabe_status !== 'Freigegeben für Moodle').length;
  const activeLocksCount = aufgaben.filter(a => a.lock_status).length;

  const stats = [
    { label: 'Einheiten',         value: sichtbareEinheiten.length, icon: BookOpen, color: 'bg-primary/10 text-primary' },
    { label: 'Lernpakete',        value: lernpakete.length,         icon: Layers,   color: 'bg-accent/10 text-accent' },
    { label: 'Lernziele',         value: lernziele.length,          icon: Target,   color: 'bg-green-100 text-green-700' },
    { label: 'Aufgabenbausteine', value: aufgaben.length,           icon: Puzzle,   color: 'bg-purple-100 text-purple-700' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Willkommen im PoolPlaner</h1>
          <p className="text-muted-foreground mt-1">Ihre Meta-Planungsebene für selbstgesteuerte Poolzeiten.</p>
        </div>
        {permissions.kannSchreiben && (
          <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />Neue Einheit
          </Button>
        )}
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
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status & Locks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Freigabestatus</h2>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {[
                { label: 'In Planung', value: inPlanung, color: 'bg-accent' },
                { label: 'Freigegeben für Moodle', value: freigegebene, color: 'bg-primary' },
              ].map(row => (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`${row.color} h-2 rounded-full transition-all`}
                      style={{ width: sichtbareEinheiten.length > 0 ? `${(row.value / sichtbareEinheiten.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Schnellzugriff</h2>
            </div>
            <div className="space-y-2">
              <Link to="/einheiten" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <span className="text-sm font-medium flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" />Alle Einheiten</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              {permissions.kannExportieren && (
                <Link to="/moodle-export" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                  <span className="text-sm font-medium flex items-center gap-2"><Puzzle className="w-4 h-4 text-green-600" />Moodle-Export</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700 text-[10px]">{freigegebene} bereit</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
              {activeLocksCount > 0 && permissions.kannBenutzerVerwalten && (
                <Link to="/benutzerverwaltung" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors bg-amber-50">
                  <span className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4 text-amber-600" />Aktive Locks</span>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">{activeLocksCount} aktiv</Badge>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Einheiten-Übersicht mit Filtern */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Einheit oder Fach suchen…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterFach} onValueChange={setFilterFach}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Fach" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Fächer</SelectItem>
              {FAECHER.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterJahrgang} onValueChange={setFilterJahrgang}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Jahrgang" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Jahrgänge</SelectItem>
              {JAHRGANGSSTUFEN.map(j => <SelectItem key={j} value={j}>Jg. {j}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="In Planung">In Planung</SelectItem>
              <SelectItem value="Freigegeben für Moodle">Freigegeben</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {gefilterteEinheiten.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-10 text-center">
              <Filter className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Keine Einheiten gefunden.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gefilterteEinheiten.map(e => {
              const paketCount  = lernpakete.filter(lp => lp.einheit_id === e.id).length;
              const paketIds    = lernpakete.filter(lp => lp.einheit_id === e.id).map(p => p.id);
              const aufgabeCount = aufgaben.filter(a => paketIds.includes(a.lernpaket_id)).length;
              const lockCount    = aufgaben.filter(a => paketIds.includes(a.lernpaket_id) && a.lock_status).length;
              const isFreigegeben = e.freigabe_status === 'Freigegeben für Moodle';
              const membership = myMemberships.find(m => m.einheit_id === e.id);
              const unitRole = membership?.unit_role || (e.created_by === authUser?.email ? 'LEITUNG' : null);

              return (
                <div key={e.id} className="relative group/card">
                  <Link to={`/einheiten/${e.id}`}>
                    <Card className="border shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 h-full cursor-pointer">
                      <CardContent className="p-5 flex flex-col gap-3 h-full">
                        <div className="flex items-start justify-between gap-2">
                          <Badge className={`text-[10px] shrink-0 ${fachColors[e.fach] || 'bg-muted text-muted-foreground'}`}>
                            {e.fach}
                          </Badge>
                          <Badge variant={isFreigegeben ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                            {isFreigegeben ? 'Freigegeben' : 'In Planung'}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm leading-snug">{e.titel_der_einheit}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">Jg. {e.jahrgangsstufe} · {e.navigationslogik}</p>
                            {unitRole && <UnitRoleBadge role={unitRole} />}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                          <span>{paketCount} Pakete · {aufgabeCount} Aufgaben</span>
                          {lockCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Lock className="w-3 h-3" />{lockCount}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteTarget({ id: e.id, titel: e.titel_der_einheit })}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-red-50 transition-all opacity-0 group-hover/card:opacity-100"
                      title="Einheit löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(search || filterFach !== 'all' || filterJahrgang !== 'all' || filterStatus !== 'all') && (
          <p className="text-xs text-muted-foreground text-center">
            {gefilterteEinheiten.length} von {sichtbareEinheiten.length} Einheiten
          </p>
        )}
      </div>

      <EinheitForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createEinheit.mutate(data)}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        titel={deleteTarget?.titel || ''}
        isLoading={isDeleting}
      />
    </div>
  );
}