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
  Lock, Unlock, AlertTriangle, CheckCircle, Mail, Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useRecordLock } from '@/hooks/useRecordLock';
import UserImport from '@/components/admin/UserImport';

const FAECHER = ["Deutsch","Mathematik","Englisch","Französisch","Latein","Biologie","Chemie","Physik","Geschichte","Geographie","Politik","Wirtschaft","Kunst","Musik","Sport","Religion","Ethik","Informatik"];

const rollenBadgeColors = {
  Administrator:      'bg-red-100 text-red-700',
  Fachschaftsleitung: 'bg-purple-100 text-purple-700',
  Fachlehrkraft:      'bg-blue-100 text-blue-700',
  Betrachter:         'bg-gray-100 text-gray-600',
  'Moodle-Designer':  'bg-green-100 text-green-700',
};

const rollenBeschreibungen = {
  Administrator:      'Vollzugriff auf alle Daten und Funktionen inkl. Benutzerverwaltung',
  Fachschaftsleitung: 'Lesezugriff global, Schreibzugriff + Freigabe im eigenen Fachbereich',
  Fachlehrkraft:      'Lesezugriff global, Schreibzugriff auf LP/LZ/AB im eigenen Fachbereich',
  Betrachter:         'Nur Lesezugriff auf alle Einheiten',
  'Moodle-Designer':  'Lesezugriff nur auf freigegebene Einheiten + Exportfunktionen',
};

function BenutzerForm({ open, onOpenChange, onSubmit, initialData }) {
  const [formData, setFormData] = useState(initialData || {
    user_id: '',
    rolle: '',
    fachbereich_zustaendigkeit: [],
    ist_aktiv: true,
  });

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
    onOpenChange(false);
  };

  const brauchtFach = ['Fachschaftsleitung', 'Fachlehrkraft'].includes(formData.rolle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {brauchtFach && (
            <div className="space-y-2">
              <Label>Fachbereich-Zuständigkeit {brauchtFach ? '*' : ''}</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 max-h-40 overflow-y-auto">
                {FAECHER.map(fach => {
                  const selected = (formData.fachbereich_zustaendigkeit || []).includes(fach);
                  return (
                    <button
                      key={fach}
                      type="button"
                      onClick={() => toggleFach(fach)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {fach}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {(formData.fachbereich_zustaendigkeit || []).length} Fach/Fächer ausgewählt
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={
                !formData.user_id ||
                !formData.rolle ||
                (brauchtFach && (formData.fachbereich_zustaendigkeit || []).length === 0)
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

export default function Benutzerverwaltung() {
  const { permissions, authUser } = useRBAC();
  const queryClient = useQueryClient();
  const { forceReleaseLock } = useRecordLock();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showImport, setShowImport] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ['benutzer'] });
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Benutzerverwaltung
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{benutzer.length} registrierte Benutzer</p>
        </div>
        <div className="flex gap-2">
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
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-semibold">Rolle</th>
                <th className="text-center px-3 py-2.5 font-semibold">Erstellen</th>
                <th className="text-center px-3 py-2.5 font-semibold">Lesen</th>
                <th className="text-center px-3 py-2.5 font-semibold">Ändern</th>
                <th className="text-center px-3 py-2.5 font-semibold">Löschen</th>
                <th className="text-center px-3 py-2.5 font-semibold">Freigabe</th>
                <th className="text-center px-3 py-2.5 font-semibold">Export</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rolle: 'Administrator',      c:'✅', r:'✅ Alle',       u:'✅ Alle',    d:'✅', f:'✅', e:'✅' },
                { rolle: 'Fachschaftsleitung', c:'⚠️ Eigene Fächer', r:'✅ Alle', u:'⚠️ Eigene Fächer', d:'⚠️ Eigene Fächer', f:'⚠️ Eigene Fächer', e:'❌' },
                { rolle: 'Fachlehrkraft',      c:'⚠️ LP/LZ/AB', r:'✅ Alle', u:'⚠️ LP/LZ/AB', d:'⚠️ LP/LZ/AB', f:'❌', e:'❌' },
                { rolle: 'Betrachter',         c:'❌', r:'✅ Alle',  u:'❌', d:'❌', f:'❌', e:'❌' },
                { rolle: 'Moodle-Designer',    c:'❌', r:'⚠️ Nur Freigegeben', u:'❌', d:'❌', f:'❌', e:'✅' },
              ].map(row => (
                <tr key={row.rolle} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <Badge className={`${rollenBadgeColors[row.rolle]} text-xs`}>{row.rolle}</Badge>
                  </td>
                  <td className="text-center px-3 py-2.5 text-xs">{row.c}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{row.r}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{row.u}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{row.d}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{row.f}</td>
                  <td className="text-center px-3 py-2.5 text-xs">{row.e}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground px-4 py-2">⚠️ = nur im eigenen Fachbereich | LP=Lernpakete, LZ=Lernziele, AB=Aufgabenbausteine</p>
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

      {/* Benutzerliste */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Registrierte Benutzer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {benutzer.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Noch keine Benutzerprofile angelegt. Klicken Sie auf „Benutzer hinzufügen".
            </p>
          ) : (
            <div className="divide-y">
              {benutzer.map(b => (
                <div key={b.id} className={`flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors ${!b.ist_aktiv ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(b.user_id || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{b.user_id}</p>
                        {b.user_id === authUser?.email && (
                          <Badge className="text-[10px] bg-primary/10 text-primary">Ich</Badge>
                        )}
                        {!b.ist_aktiv && (
                          <Badge className="text-[10px] bg-muted text-muted-foreground">Inaktiv</Badge>
                        )}
                      </div>
                      {b.fachbereich_zustaendigkeit?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {b.fachbereich_zustaendigkeit.map(f => (
                            <span key={f} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{f}</span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Hinzugefügt: {b.created_date && format(new Date(b.created_date), 'dd.MM.yyyy', { locale: de })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${rollenBadgeColors[b.rolle] || 'bg-muted text-muted-foreground'}`}>
                      {b.rolle}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setEditingUser(b); }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
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
        </CardContent>
      </Card>

      {/* Forms */}
      <BenutzerForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={(data) => createMutation.mutate(data)}
      />

      {editingUser && (
        <BenutzerForm
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null); }}
          onSubmit={(data) => updateMutation.mutate({ id: editingUser.id, data })}
          initialData={editingUser}
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