import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFoot, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ShieldCheck, UserPlus, Trash2, Edit, Users, 
  Lock, Unlock, AlertTriangle, CheckCircle, Mail, Upload, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useResourceLock } from '@/hooks/useResourceLock';
import UserImport from '@/components/admin/UserImport';
import UserInviteTab from '@/components/admin/UserInviteTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';

const rollenBadgeColors = {
  Administrator:      'bg-red-100 text-red-700',
  Fachschaftsleitung: 'bg-purple-100 text-purple-700',
  Fachlehrkraft:      'bg-blue-100 text-blue-700',
  Betrachter:         'bg-gray-100 text-gray-600',
  'Moodle-Designer':  'bg-green-100 text-green-700',
};

const rollenBeschreibungen = {
  Administrator:      'Vollzugriff auf alle Daten und Funktionen, bedient Moodle-Export.',
  Fachschaftsleitung: 'Verwaltet Struktur (Einheiten/Themenfelder) + Inhalte im eigenen Fachbereich. Lesezugriff auf Export.',
  Fachlehrkraft:      'Erstellt/bearbeitet Aktivitäten & Aufgaben im eigenen Fachbereich. Kann Inhalte freigeben. Lesezugriff auf Export.',
  Betrachter:         'Nur Lesezugriff auf alle Inhalte. Kein Zugriff auf Export.',
  'Moodle-Designer':  'Bedient Moodle-Export. Lesezugriff auf freigegebene Inhalte.',
};

function BenutzerForm({ open, onOpenChange, onSubmit, initialData, faecher = [] }) {
  const [formData, setFormData] = useState(initialData || {
    user_id: '',
    vorname: '',
    nachname: '',
    rolle: '',
    fachbereich_zustaendigkeit: [],
    ist_aktiv: true,
  });

  const handleOpenChange = (newOpen) => {
    if (!newOpen && !initialData) {
      // Fenster schließen ohne zu bearbeiten → reset
      setFormData({
        user_id: '',
        vorname: '',
        nachname: '',
        rolle: '',
        fachbereich_zustaendigkeit: [],
        ist_aktiv: true,
      });
    }
    onOpenChange(newOpen);
  };

  const toggleFach = (fach) => {
    const current = formData.fachbereich_zustaendigkeit || [];
    setFormData({
      ...formData,
      fachbereich_zustaendigkeit: current.includes(fach)
        ? current.filter(f => f !== fach)
        : [...current, fach],
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    if (!initialData) {
      setFormData({
        user_id: '',
        vorname: '',
        nachname: '',
        rolle: '',
        fachbereich_zustaendigkeit: [],
        ist_aktiv: true,
      });
    }
    handleOpenChange(false);
  };

  const brauchtFach = ['Fachschaftsleitung', 'Fachlehrkraft'].includes(formData.rolle);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Benutzer bearbeiten' : 'Benutzer hinzufügen'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>E-Mail-Adresse *</Label>
            <Input
              type="email"
              value={formData.user_id}
              onChange={e => setFormData({ ...formData, user_id: e.target.value })}
              placeholder="name@schule.de"
              disabled={!!initialData}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vorname *</Label>
              <Input
                value={formData.vorname}
                onChange={e => setFormData({ ...formData, vorname: e.target.value })}
                placeholder="Max"
              />
            </div>
            <div className="space-y-2">
              <Label>Nachname *</Label>
              <Input
                value={formData.nachname}
                onChange={e => setFormData({ ...formData, nachname: e.target.value })}
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rolle *</Label>
            <Select value={formData.rolle} onValueChange={v => setFormData({ ...formData, rolle: v })}>
              <SelectTrigger><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
              <SelectContent>
                {Object.values(ROLLEN).map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.rolle && (
              <p className="text-xs text-muted-foreground">{rollenBeschreibungen[formData.rolle]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fachbereich-Zuständigkeit * (max. 5)</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-40 overflow-y-auto scroll-container">
              {faecher.filter(f => f.ist_aktiv).sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)).map(fach => {
                const selected = (formData.fachbereich_zustaendigkeit || []).includes(fach.name);
                const isFull = (formData.fachbereich_zustaendigkeit || []).length >= 5;
                return (
                  <button
                    key={fach.id}
                    type="button"
                    onClick={() => toggleFach(fach.name)}
                    disabled={isFull && !selected}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : isFull
                          ? 'opacity-50 cursor-not-allowed bg-background text-foreground border-border'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    {fach.name}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {(formData.fachbereich_zustaendigkeit || []).length}/5 Fächer ausgewählt
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={
                !formData.user_id ||
                !formData.vorname ||
                !formData.nachname ||
                !formData.rolle ||
                (formData.fachbereich_zustaendigkeit || []).length === 0
              }
            >
              {initialData ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Mobile Rechtematrix als aufklappbare Cards
function MobileRechteMatrix() {
  const [expanded, setExpanded] = useState(null);
  const rollen = [
    { rolle: 'Administrator',      farbe: rollenBadgeColors.Administrator,      rechte: ['Struktur: alles erstellen & bearbeiten', 'Inhalte: alles erstellen, bearbeiten, freigeben', 'Export: bedienen & lesen'] },
    { rolle: 'Fachschaftsleitung', farbe: rollenBadgeColors.Fachschaftsleitung, rechte: ['Struktur: erstellen & bearbeiten (nur eigenes Fach)', 'Inhalte: erstellen, bearbeiten, freigeben (nur eigenes Fach)', 'Export: nur lesen'] },
    { rolle: 'Fachlehrkraft',      farbe: rollenBadgeColors.Fachlehrkraft,      rechte: ['Struktur: kein Zugriff', 'Inhalte: erstellen, bearbeiten, freigeben (nur eigenes Fach)', 'Export: nur lesen'] },
    { rolle: 'Betrachter',         farbe: rollenBadgeColors.Betrachter,         rechte: ['Struktur: kein Zugriff', 'Inhalte: nur lesen', 'Export: kein Zugriff'] },
    { rolle: 'Moodle-Designer',    farbe: rollenBadgeColors['Moodle-Designer'],  rechte: ['Struktur: kein Zugriff', 'Inhalte: nur Freigegebene lesen', 'Export: bedienen & lesen'] },
  ];
  return (
    <div className="space-y-2">
      {rollen.map(r => (
        <div key={r.rolle} className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            onClick={() => setExpanded(expanded === r.rolle ? null : r.rolle)}
          >
            <Badge className={`${r.farbe} text-xs`}>{r.rolle}</Badge>
            {expanded === r.rolle ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {expanded === r.rolle && (
            <div className="px-4 py-3 space-y-1 bg-white">
              {r.rechte.map((recht, i) => (
                <p key={i} className="text-sm text-foreground">{recht}</p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Mobile Benutzerliste als Cards
function MobileBenutzerCard({ b, authUser, onEdit, onDelete }) {
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${!b.ist_aktiv ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {(b.user_id || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold">{b.vorname} {b.nachname}</p>
              {b.user_id === authUser?.email && (
                <Badge className="text-[10px] bg-primary/10 text-primary">Ich</Badge>
              )}
              {!b.ist_aktiv && (
                <Badge className="text-[10px] bg-muted text-muted-foreground">Inaktiv</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{b.user_id}</p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onEdit(b)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-9 w-9"
            disabled={b.user_id === authUser?.email}
            onClick={() => onDelete(b.id)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Badge className={`${rollenBadgeColors[b.rolle] || 'bg-muted text-muted-foreground'} text-xs`}>
          {b.rolle}
        </Badge>
        {b.fachbereich_zustaendigkeit?.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {b.fachbereich_zustaendigkeit.map(f => (
              <span key={f} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Benutzerverwaltung() {
  const isMobile = useIsMobile();
  const { permissions, authUser } = useRBAC();
  const queryClient = useQueryClient();
  const { forceReleaseLock } = useResourceLock('Aufgabenbausteine', ['aufgaben', 'aufgabenbausteine'], null, null, false);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('reihenfolge'),
    enabled: permissions.kannBenutzerVerwalten,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['appUsers'],
    queryFn: async () => {
      try {
        const result = await base44.asServiceRole.entities.User.list();
        return result || [];
      } catch (err) {
        console.error('User-Liste konnte nicht geladen werden:', err);
        return [];
      }
    },
    enabled: permissions.kannBenutzerVerwalten,
  });

  const { data: benutzer = [], isLoading } = useQuery({
    queryKey: ['benutzer'],
    queryFn: () => base44.entities.Benutzer.list('-created_date'),
    enabled: permissions.kannBenutzerVerwalten,
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: permissions.kannBenutzerVerwalten,
  });

  const lockedAufgaben = aufgaben.filter(a => a.lock_status);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Benutzer.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['benutzer'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Benutzer.update(id, data),
    onSuccess: () => {
      // ✅ Cache-Invalidierung bei Rollenwechsel
      queryClient.invalidateQueries({ queryKey: ['benutzer'] });
      // ✅ KRITISCH: Globale RBAC-Caches invalidieren bei globalem Rollenwechsel
      queryClient.invalidateQueries({ queryKey: ['benutzerProfil'] });
      queryClient.invalidateQueries({ queryKey: ['authUser'] });
      // ✅ System-Permissions neu berechnen
      queryClient.invalidateQueries({ queryKey: ['systemeinstellungen'] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Benutzer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benutzer'] });
      setDeleteId(null);
    },
  });

  if (!permissions.kannBenutzerVerwalten) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ShieldCheck className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Kein Zugriff. Diese Seite ist nur für Administratoren.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Benutzerverwaltung
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {benutzer.filter(b => users?.find(u => u.email === b.user_id)).length} registriert | {benutzer.filter(b => !users?.find(u => u.email === b.user_id)).length} ausstehend
          </p>
        </div>
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
          <Button variant="outline" onClick={() => setShowImport(v => !v)} className="gap-2">
            <Upload className="w-4 h-4" />{showImport ? 'Import schließen' : 'CSV importieren'}
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />Benutzer hinzufügen
          </Button>
        </div>
      </div>

      {/* CSV-Import */}
      {showImport && (
        <UserImport onImportSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['benutzer'] });
        }} />
      )}

      {/* Rechtematrix-Übersicht */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rechtematrix</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            3 Bereiche: Struktur (Einheiten/Themenfelder/LP) | Inhalte (Aktivitäten/Aufgaben) | Export (Moodle)
          </p>
        </CardHeader>
        <CardContent className={isMobile ? 'pb-4' : 'p-0 overflow-x-auto'}>
          {isMobile ? (
            <MobileRechteMatrix />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-semibold">Rolle</th>
                    <th colSpan="3" className="text-center px-3 py-2.5 font-semibold border-l">Bereich 1: Struktur</th>
                    <th colSpan="4" className="text-center px-3 py-2.5 font-semibold border-l">Bereich 2: Inhalte</th>
                    <th colSpan="2" className="text-center px-3 py-2.5 font-semibold border-l">Bereich 3: Export</th>
                  </tr>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-4 py-1.5 font-medium text-xs">-</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs">E</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs">B</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs border-l">E</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs">B</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs">L</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs">F</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs border-l">Bed.</th>
                    <th className="text-center px-2 py-1.5 font-medium text-xs">Les.</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rolle: 'Administrator', s_e:'✅', s_b:'✅', s_l:'✅', c_e:'✅', c_b:'✅', c_l:'✅', c_f:'✅', e_bed:'✅', e_les:'✅' },
                    { rolle: 'Fachschaftsleitung', s_e:'✅*', s_b:'✅*', s_l:'✅*', c_e:'✅*', c_b:'✅*', c_l:'✅*', c_f:'✅*', e_bed:'❌', e_les:'✅' },
                    { rolle: 'Fachlehrkraft', s_e:'❌', s_b:'❌', s_l:'❌', c_e:'✅*', c_b:'✅*', c_l:'✅*', c_f:'✅*', e_bed:'❌', e_les:'✅' },
                    { rolle: 'Betrachter', s_e:'❌', s_b:'❌', s_l:'❌', c_e:'❌', c_b:'❌', c_l:'✅', c_f:'❌', e_bed:'❌', e_les:'❌' },
                    { rolle: 'Moodle-Designer', s_e:'❌', s_b:'❌', s_l:'❌', c_e:'❌', c_b:'❌', c_l:'✅**', c_f:'❌', e_bed:'✅', e_les:'✅' },
                  ].map(row => (
                    <tr key={row.rolle} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <Badge className={`${rollenBadgeColors[row.rolle]} text-xs`}>{row.rolle}</Badge>
                      </td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.s_e}</td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.s_b}</td>
                      <td className="text-center px-2 py-2.5 text-xs border-l">{row.s_l}</td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.c_e}</td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.c_b}</td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.c_l}</td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.c_f}</td>
                      <td className="text-center px-2 py-2.5 text-xs border-l">{row.e_bed}</td>
                      <td className="text-center px-2 py-2.5 text-xs">{row.e_les}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground px-4 py-3">
                <strong>Legende:</strong> E=Erstellen, B=Bearbeiten, L=Löschen, F=Freigeben, Bed.=Bedienen, Les.=Lesen
                <br />
                <strong>*</strong> = nur im eigenen Fachbereich | <strong>**</strong> = nur Freigegeben
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Aktive Locks (Admin-Override) */}
      {lockedAufgaben.length > 0 && (
        <Card className="border border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <Lock className="w-4 h-4" />
              Aktive Record-Locks ({lockedAufgaben.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lockedAufgaben.map(aufgabe => (
              <div key={aufgabe.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">{aufgabe.baustein_typ}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />{aufgabe.locked_by_user}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-100"
                  onClick={() => forceReleaseLock(aufgabe.id)}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Lock aufheben
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Benutzerliste mit Tabs */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Benutzerverwaltung
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="registered" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
              <TabsTrigger value="registered" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary">
                Registrierte Benutzer
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary">
                Ausstehende Einladungen ({benutzer.filter(b => !users?.find(u => u.email === b.user_id)).length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Registrierte */}
            <TabsContent value="registered" className="p-4 m-0">
              {benutzer.filter(b => users?.find(u => u.email === b.user_id)).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Noch keine registrierten Benutzer.
                </p>
              ) : isMobile ? (
                <div className="space-y-3">
                  {benutzer.filter(b => users?.find(u => u.email === b.user_id)).map(b => (
                    <MobileBenutzerCard
                      key={b.id}
                      b={b}
                      authUser={authUser}
                      onEdit={setEditingUser}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {benutzer.filter(b => users?.find(u => u.email === b.user_id)).map(b => (
                    <div key={b.id} className={`flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors ${!b.ist_aktiv ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(b.user_id || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{b.vorname} {b.nachname}</p>
                            {b.user_id === authUser?.email && (
                              <Badge className="text-[10px] bg-primary/10 text-primary">Ich</Badge>
                            )}
                            {!b.ist_aktiv && (
                              <Badge className="text-[10px] bg-muted text-muted-foreground">Inaktiv</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{b.user_id}</p>
                          {b.fachbereich_zustaendigkeit?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.fachbereich_zustaendigkeit.map(f => (
                                <span key={f} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{f}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${rollenBadgeColors[b.rolle] || 'bg-muted text-muted-foreground'}`}>
                          {b.rolle}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(b); }}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            disabled={b.user_id === authUser?.email}
                            onClick={() => setDeleteId(b.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                  </TabsContent>

                  {/* Tab 2: Ausstehende Einladungen */}
                  <TabsContent value="pending" className="p-4 m-0">
                  <UserInviteTab
                    benutzer={benutzer}
                    onEdit={setEditingUser}
                    onDelete={setDeleteId}
                  />
                  </TabsContent>
                  </Tabs>
                  </CardContent>
                  </Card>

      {/* Forms */}
      <BenutzerForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
        faecher={faecher}
      />

      {editingUser && (
        <BenutzerForm
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null); }}
          onSubmit={(data) => updateMutation.mutate({ id: editingUser.id, data })}
          initialData={editingUser}
          faecher={faecher}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Benutzer entfernen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Das Benutzerprofil wird gelöscht. Der Nutzer verliert sofort alle Zugriffsrechte. 
              Der Login-Account (E-Mail) bleibt bestehen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFoot>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Endgültig entfernen
            </AlertDialogAction>
          </AlertDialogFoot>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}