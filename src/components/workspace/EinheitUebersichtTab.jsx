/**
 * EinheitUebersichtTab.jsx
 *
 * Tab 0 im Workspace: "Einheit anlegen"
 * Zeigt die Einheits-Metadaten (Titel, Ziel, Fach, Jahrgang, Status)
 * und die Teammitglieder direkt im Hauptbereich – kein Dialog.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Plus, Trash2, Crown, Edit, Eye, Lock, Unlock, ShieldAlert, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDraftState } from '@/hooks/useDraftState';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GesamtzielManager from './GesamtzielManager';

const UNIT_ROLE_CONFIG = {
  LEITUNG: { 
    label: 'Leitung', 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    Icon: Crown,
    description: 'Vollständiger Zugriff: Alles verwalten, Mitglieder hinzufügen/entfernen, Rollen ändern.'
  },
  EDITOR:  { 
    label: 'Editor',  
    color: 'bg-blue-100 text-blue-700 border-blue-200',   
    Icon: Edit,
    description: 'Bearbeiten erlaubt: Inhalte erstellen, ändern und löschen. Keine Verwaltung.'
  },
  READER:  { 
    label: 'Leser',   
    color: 'bg-slate-100 text-slate-600 border-slate-200', 
    Icon: Eye,
    description: 'Nur Leserechte: Inhalte ansehen, aber nicht bearbeiten oder löschen.'
  },
};

function UnitRoleBadge({ role }) {
  const cfg = UNIT_ROLE_CONFIG[role] || UNIT_ROLE_CONFIG.READER;
  const Icon = cfg.Icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 border rounded-full font-medium text-[10px] px-2 py-0.5 cursor-help', cfg.color)}>
            <Icon className="w-2.5 h-2.5" />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">
          {cfg.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function EinheitUebersichtTab({ einheit, currentUserEmail, currentUserRole, currentUserFaecher = [] }) {
  const queryClient = useQueryClient();
  const { faecher, jahrgaenge } = useSystemSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingMitarbeiter, setAddingMitarbeiter] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('EDITOR');
  const [mitarbeiterEmail, setMitarbeiterEmail] = useState('');

  const draftKey = `einheit-settings-${einheit.id}`;
  const { data: form, setData: setForm } = useDraftState(draftKey, {
    titel_der_einheit: einheit.titel_der_einheit || '',
    fach:              einheit.fach || '',
    jahrgangsstufe:    einheit.jahrgangsstufe || '',
  });

  const [isLocking, setIsLocking] = useState(false);

  // Wer darf den Sperrstatus ändern?
  const kannSperrenToggle = currentUserRole === 'Administrator' ||
    (currentUserRole === 'Fachschaftsleitung' && currentUserFaecher.includes(einheit.fach));

  const istGesperrt = einheit.freigabe_status === 'Gesperrt';

  const handleToggleSperre = async () => {
    setIsLocking(true);
    try {
      const neuerStatus = istGesperrt ? 'Freigegeben für Bearbeitung' : 'Gesperrt';
      await base44.entities.Einheiten.update(einheit.id, { freigabe_status: neuerStatus });
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      toast.success(istGesperrt
        ? 'Einheit ist jetzt für die Bearbeitung freigegeben.'
        : 'Einheit wurde für die Bearbeitung gesperrt.'
      );
    } catch {
      toast.error('Fehler beim Ändern des Sperrstatus.');
    } finally {
      setIsLocking(false);
    }
  };

  const set = (key, val) => setForm({ ...form, [key]: val });

  // ── Membership ──────────────────────────────────────────────────────────────
  const [previousMembership, setPreviousMembership] = React.useState(null);

  const { data: myMembership } = useQuery({
    queryKey: ['einheit-members', einheit.id, currentUserEmail],
    queryFn: () => base44.entities.EinheitMembers.filter({ einheit_id: einheit.id, user_email: currentUserEmail }),
    enabled: !!currentUserEmail,
    select: d => d[0],
    staleTime: 5000,  // ✅ Nur 5 Sekunden Cache
    refetchInterval: 10000,  // ✅ Alle 10s im Hintergrund neuladen
    refetchOnWindowFocus: true,  // ✅ Bei Tab-Wechsel neu validieren
  });

  // ✅ Warnung, falls Delegation entzogen wurde
  React.useEffect(() => {
    if (previousMembership && !myMembership) {
      toast.warning(
        '🔒 Ihre Bearbeitungsrechte für diese Einheit wurden entzogen. ' +
        'Bitte aktualisieren Sie die Seite.'
      );
    }
    setPreviousMembership(myMembership);
  }, [myMembership]);

  const isLeitung = myMembership?.unit_role === 'LEITUNG' || einheit.created_by === currentUserEmail;

  // Prüfe ob Benutzer darf Mitarbeiter hinzufügen (Admin oder Fachschaftsleitung im eigenen Fach)
  const kannMitarbeiterHinzufuegen = currentUserRole === 'Administrator' || 
    (currentUserRole === 'Fachschaftsleitung' && currentUserFaecher.includes(einheit.fach));

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['einheit-members', einheit.id],
    queryFn: () => base44.entities.EinheitMembers.filter({ einheit_id: einheit.id }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isLeitung,
  });

  const { data: allLernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  // Gefiltert: nur Lernpakete der aktuellen Einheit, die gerade gesperrt sind
  const paketeFuerEinheit = allLernpakete.filter(p => p.einheit_id === einheit.id);
  const activeLocks = paketeFuerEinheit.filter(p => p.is_locked && p.locked_by_email);

  // Für Mitarbeiter hinzufügen: nur Fachlehrkräfte
  const availableFachlehrkraefteForMitarbeiter = allUsers.filter(u => 
    u.role === 'Fachlehrkraft' && 
    !members.find(m => m.user_email === u.email && m.unit_role === 'LEITUNG')
  );

  const availableUsers = allUsers.filter(u => !members.find(m => m.user_email === u.email));

  // ── Mutations ───────────────────────────────────────────────────────────────
  const addMember = useMutation({
    mutationFn: async ({ email, role }) => {
      // ✅ Nutze gesicherte Backend-Funktion
      return await base44.functions.invoke('addEinheitMemberSecure', {
        einheitId: einheit.id,
        targetEmail: email,
        newRole: role
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      setNewEmail(''); setNewRole('EDITOR'); setAdding(false);
      toast.success('Mitglied hinzugefügt.');
    },
    onError: (err) => {
      const msg = err.message || '';
      if (msg.includes('Berechtigung') || msg.includes('403')) {
        toast.error('🔒 Zugriff verweigert. Du benötigst Fachschaftsleiter-Rechte für diesen Bereich.');
      } else {
        toast.error('Fehler beim Hinzufügen. Bitte versuchen Sie es erneut.');
      }
    },
  });

  const addMitarbeiter = useMutation({
    mutationFn: async (email) => {
      // ✅ Nutze gesicherte Backend-Funktion mit LEITUNG-Rolle
      return await base44.functions.invoke('addEinheitMemberSecure', {
        einheitId: einheit.id,
        targetEmail: email,
        newRole: 'LEITUNG'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      setMitarbeiterEmail('');
      setAddingMitarbeiter(false);
      toast.success('Mitarbeiter hinzugefügt.');
    },
    onError: (err) => {
      const msg = err.message || '';
      if (msg.includes('Berechtigung') || msg.includes('403')) {
        toast.error('🔒 Zugriff verweigert. Du benötigst Fachschaftsleiter-Rechte für diesen Bereich.');
      } else {
        toast.error('Fehler beim Hinzufügen. Bitte versuchen Sie es erneut.');
      }
    },
  });

  const removeMember = useMutation({
    mutationFn: (id) => base44.entities.EinheitMembers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      toast.success('Mitglied entfernt.');
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }) => base44.entities.EinheitMembers.update(memberId, { unit_role: role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] }),
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await base44.entities.Einheiten.update(einheit.id, form);
      queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      localStorage.removeItem(draftKey);
      toast.success('Einheit gespeichert.');
    } catch {
      toast.error('Fehler beim Speichern.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full">

      {/* ── Zweispalten-Layout: Konfiguration | Mitarbeiter ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* ── Spalte 1: Metadaten ──────────────────────────────────────────────── */}
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Einheit konfigurieren</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Titel, Ziel, Fach und Status dieser Unterrichtseinheit.</p>
          </div>

          <div className="space-y-4 p-5 rounded-xl border bg-card">
            <div className="space-y-1.5">
              <Label>Titel der Einheit *</Label>
              <Input
                value={form.titel_der_einheit}
                onChange={e => set('titel_der_einheit', e.target.value)}
                placeholder="z.B. Interpretation von Kurzgeschichten"
              />
            </div>

            <div className="space-y-1.5 pt-2 pb-4 border-t">
              <GesamtzielManager 
                einheitId={einheit.id}
                gesamtziele={einheit.gesamtziele || []}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['einheiten'] });
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fach *</Label>
                <Select value={form.fach} onValueChange={v => set('fach', v)}>
                  <SelectTrigger><SelectValue placeholder="Fach wählen" /></SelectTrigger>
                  <SelectContent>
                    {faecher.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jahrgangsstufe *</Label>
                <Select value={form.jahrgangsstufe} onValueChange={v => set('jahrgangsstufe', v)}>
                  <SelectTrigger><SelectValue placeholder="Jahrgang" /></SelectTrigger>
                  <SelectContent>
                    {jahrgaenge.map(j => <SelectItem key={j} value={j}>Jg. {j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleSave}
                disabled={isSaving || !form.titel_der_einheit || !form.fach || !form.jahrgangsstufe}
                className="gap-2"
              >
                {isSaving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Save className="w-4 h-4" />}
                Speichern
              </Button>
            </div>
          </div>
        </section>

        {/* ── Spalte 2: Bearbeitungsstatus + Mitarbeiter ───────────────────────── */}
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Bearbeitungsstatus</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Steuert, ob Lehrkräfte Inhalte dieser Einheit bearbeiten dürfen.</p>
          </div>

          <div className={cn(
            'p-5 rounded-xl border',
            istGesperrt ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                istGesperrt ? 'bg-red-100' : 'bg-green-100'
              )}>
                {istGesperrt
                  ? <Lock className="w-5 h-5 text-red-600" />
                  : <Unlock className="w-5 h-5 text-green-600" />
                }
              </div>
              <div className="flex-1">
                <p className={cn('font-semibold text-sm', istGesperrt ? 'text-red-800' : 'text-green-800')}>
                  {istGesperrt ? 'Einheit gesperrt' : 'Einheit freigegeben'}
                </p>
                <p className={cn('text-xs mt-1', istGesperrt ? 'text-red-600' : 'text-green-600')}>
                  {istGesperrt
                    ? 'Lehrkräfte können diese Einheit gerade nicht bearbeiten. Nur Lesen ist erlaubt.'
                    : 'Lehrkräfte können Inhalte dieser Einheit bearbeiten.'
                  }
                </p>
              </div>
            </div>

            {kannSperrenToggle ? (
              <div className="mt-4">
                <Button
                  onClick={handleToggleSperre}
                  disabled={isLocking}
                  variant={istGesperrt ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'gap-2 w-full',
                    !istGesperrt && 'border-red-300 text-red-700 hover:bg-red-50'
                  )}
                >
                  {isLocking
                    ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : istGesperrt
                      ? <Unlock className="w-3.5 h-3.5" />
                      : <Lock className="w-3.5 h-3.5" />
                  }
                  {istGesperrt ? 'Einheit für Bearbeitung freigeben' : 'Einheit für Bearbeitung sperren'}
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                Nur Fachschaftsleitungen und Administratoren können den Sperrstatus ändern.
              </div>
            )}
          </div>

          {/* ── Mitarbeiter (direkt unter Bearbeitungsstatus) ─────────────────── */}
          <div>
            <h2 className="text-lg font-semibold">Mitarbeiter</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Fachlehrkräfte dieser Einheit volle Bearbeitungsrechte geben.</p>
          </div>

          <div className="space-y-3 p-5 rounded-xl border bg-card">
            {members.filter(m => m.unit_role === 'LEITUNG').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Noch keine Mitarbeiter zugewiesen.</p>
            ) : (
              members.filter(m => m.unit_role === 'LEITUNG').map(m => {
                const user = allUsers.find(u => u.email === m.user_email);
                if (!user || user.role !== 'Fachlehrkraft') return null;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                      {(m.user_name || m.user_email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user_name || m.user_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.user_email}</p>
                    </div>
                    {isLeitung && (
                      <button
                        onClick={() => removeMember.mutate(m.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {isLeitung && (
              <div className="pt-1">
                {!addingMitarbeiter ? (
                  <Button variant="outline" size="sm" onClick={() => setAddingMitarbeiter(true)} className="gap-2 w-full">
                    <Plus className="w-3.5 h-3.5" /> Mitarbeiter hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-semibold text-muted-foreground">Fachlehrkraft auswählen</p>
                    {availableFachlehrkraefteForMitarbeiter.length > 0 ? (
                      <Select value={mitarbeiterEmail} onValueChange={setMitarbeiterEmail}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Fachlehrkraft wählen…" /></SelectTrigger>
                        <SelectContent>
                          {availableFachlehrkraefteForMitarbeiter.map(u => (
                            <SelectItem key={u.email} value={u.email}>
                              <span className="font-medium">{u.full_name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground">Keine verfügbaren Fachlehrkräfte.</p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setAddingMitarbeiter(false); setMitarbeiterEmail(''); }} className="flex-1">Abbrechen</Button>
                      <Button size="sm" className="flex-1 gap-1" disabled={!mitarbeiterEmail || addMitarbeiter.isPending} onClick={() => addMitarbeiter.mutate(mitarbeiterEmail)}>
                        <Plus className="w-3.5 h-3.5" /> Hinzufügen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Lernpakete im Bearbeitungsmodus (in rechter Spalte) ───────────── */}
          <div>
           <h2 className="text-lg font-semibold">Lernpakete im Bearbeitungsmodus</h2>
           <p className="text-sm text-muted-foreground mt-0.5">Zeigt an, welche Lernpakete gerade bearbeitet werden.</p>
          </div>

          <div className="space-y-3 p-5 rounded-xl border bg-card">
           {activeLocks.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Keine Lernpakete werden gerade bearbeitet.</p>
           ) : (
             activeLocks.map(paket => (
               <div key={paket.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background hover:border-primary/30 transition-colors">
                 <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                   <Clock className="w-4 h-4" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium truncate">{paket.titel_des_pakets}</p>
                   <p className="text-xs text-muted-foreground mt-0.5">
                     Bearbeitet von <strong>{paket.locked_by_email}</strong>
                   </p>
                   {paket.locked_at && (
                     <p className="text-xs text-muted-foreground/60 mt-1">
                       Seit {new Date(paket.locked_at).toLocaleString('de-DE', {
                         hour: '2-digit',
                         minute: '2-digit',
                         second: '2-digit'
                       })}
                     </p>
                   )}
                 </div>
               </div>
             ))
           )}
          </div>
          </section>

          </div>
          </div>
          );
          }