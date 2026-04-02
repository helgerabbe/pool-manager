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
import { Save, Plus, Trash2, Crown, Edit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDraftState } from '@/hooks/useDraftState';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    gesamtziel:        einheit.gesamtziel || '',
    fach:              einheit.fach || '',
    jahrgangsstufe:    einheit.jahrgangsstufe || '',
    freigabe_status:   einheit.freigabe_status || 'In Planung',
  });

  const set = (key, val) => setForm({ ...form, [key]: val });

  // ── Membership ──────────────────────────────────────────────────────────────
  const { data: myMembership } = useQuery({
    queryKey: ['einheit-members', einheit.id, currentUserEmail],
    queryFn: () => base44.entities.EinheitMembers.filter({ einheit_id: einheit.id, user_email: currentUserEmail }),
    enabled: !!currentUserEmail,
    select: d => d[0],
  });
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

  // Für Mitarbeiter hinzufügen: nur Fachlehrkräfte
  const availableFachlehrkraefteForMitarbeiter = allUsers.filter(u => 
    u.role === 'Fachlehrkraft' && 
    !members.find(m => m.user_email === u.email && m.unit_role === 'LEITUNG')
  );

  const availableUsers = allUsers.filter(u => !members.find(m => m.user_email === u.email));

  // ── Mutations ───────────────────────────────────────────────────────────────
  const addMember = useMutation({
    mutationFn: async ({ email, role }) => {
      const existing = members.find(m => m.user_email === email);
      if (existing) return base44.entities.EinheitMembers.update(existing.id, { unit_role: role });
      const user = allUsers.find(u => u.email === email);
      return base44.entities.EinheitMembers.create({
        einheit_id: einheit.id,
        user_email: email,
        user_name: user?.full_name || email,
        unit_role: role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      setNewEmail(''); setNewRole('EDITOR'); setAdding(false);
      toast.success('Mitglied hinzugefügt.');
    },
    onError: () => toast.error('Fehler beim Hinzufügen.'),
  });

  const addMitarbeiter = useMutation({
    mutationFn: async (email) => {
      const user = allUsers.find(u => u.email === email);
      return base44.entities.EinheitMembers.create({
        einheit_id: einheit.id,
        user_email: email,
        user_name: user?.full_name || email,
        unit_role: 'LEITUNG', // Mitarbeiter bekommen LEITUNG-Rechte
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheit.id] });
      setMitarbeiterEmail('');
      setAddingMitarbeiter(false);
      toast.success('Mitarbeiter hinzugefügt.');
    },
    onError: () => toast.error('Fehler beim Hinzufügen.'),
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

      {/* ── Zweispalten-Layout: Konfiguration | Team ──────────────────────────── */}
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

            <div className="space-y-1.5">
              <Label>Gesamtziel der Einheit</Label>
              <textarea
                value={form.gesamtziel}
                onChange={e => set('gesamtziel', e.target.value)}
                placeholder="Was ist die Kernkompetenz am Ende dieser Einheit?"
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-28 resize-none bg-background"
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

            <div className="space-y-1.5">
              <Label>Freigabestatus</Label>
              <Select value={form.freigabe_status} onValueChange={v => set('freigabe_status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Planung">In Planung</SelectItem>
                  <SelectItem value="Freigegeben für Moodle">Freigegeben für Moodle</SelectItem>
                </SelectContent>
              </Select>
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

        {/* ── Spalte 2: Team ───────────────────────────────────────────────────── */}
        <section className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Team</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Mitglieder und ihre Rollen in dieser Einheit.</p>
          </div>

          <div className="space-y-3 p-5 rounded-xl border bg-card">
            {membersLoading ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Noch keine Mitglieder zugewiesen.</p>
            ) : (
              members.map(m => {
                const isMe = m.user_email === currentUserEmail;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {(m.user_name || m.user_email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.user_name || m.user_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.user_email}</p>
                    </div>
                    {isLeitung && !isMe ? (
                      <Select value={m.unit_role} onValueChange={v => updateRole.mutate({ memberId: m.id, role: v })}>
                        <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEITUNG">Leitung</SelectItem>
                          <SelectItem value="EDITOR">Editor</SelectItem>
                          <SelectItem value="READER">Leser</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <UnitRoleBadge role={m.unit_role} />
                    )}
                    {isLeitung && !isMe && (
                      <button
                        onClick={() => removeMember.mutate(m.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isMe && <span className="text-[10px] text-muted-foreground italic shrink-0">Ich</span>}
                  </div>
                );
              })
            )}

            {isLeitung && (
              <div className="pt-1">
                {!adding ? (
                  <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-2 w-full">
                    <Plus className="w-3.5 h-3.5" /> Mitglied hinzufügen
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs font-semibold text-muted-foreground">Neues Mitglied</p>
                    {availableUsers.length > 0 ? (
                      <Select value={newEmail} onValueChange={setNewEmail}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Nutzer auswählen…" /></SelectTrigger>
                        <SelectContent>
                          {availableUsers.map(u => (
                            <SelectItem key={u.email} value={u.email}>
                              <span className="font-medium">{u.full_name}</span>
                              <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="E-Mail-Adresse…" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="text-sm" />
                    )}
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted-foreground">Rolle</p>
                      <div className="grid grid-cols-3 gap-2">
                        {['LEITUNG', 'EDITOR', 'READER'].map(roleKey => (
                          <TooltipProvider key={roleKey}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setNewRole(roleKey)}
                                  className={cn(
                                    'p-2 rounded-lg border text-xs font-medium transition-all cursor-help',
                                    newRole === roleKey
                                      ? UNIT_ROLE_CONFIG[roleKey].color
                                      : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                  )}
                                >
                                  {UNIT_ROLE_CONFIG[roleKey].Icon && (
                                    <>
                                      {React.createElement(UNIT_ROLE_CONFIG[roleKey].Icon, { className: 'w-3 h-3 inline mr-1' })}
                                    </>
                                  )}
                                  {UNIT_ROLE_CONFIG[roleKey].label}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs text-xs">
                                {UNIT_ROLE_CONFIG[roleKey].description}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewEmail(''); }} className="flex-1">Abbrechen</Button>
                      <Button size="sm" className="flex-1 gap-1" disabled={!newEmail || addMember.isPending} onClick={() => addMember.mutate({ email: newEmail, role: newRole })}>
                        <Plus className="w-3.5 h-3.5" /> Hinzufügen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Spalte 3: Mitarbeiter (nur Admin + Fachschaftsleitung) ─────────── */}
        {kannMitarbeiterHinzufuegen && (
          <section className="space-y-5 lg:col-span-2">
            <div>
              <h2 className="text-lg font-semibold">Mitarbeiter</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Fachlehrkräfte dieser Einheit volle Bearbeitungsrechte geben.</p>
            </div>

            <div className="space-y-3 p-5 rounded-xl border bg-card">
              {/* Mitarbeiter-Liste (nur LEITUNG in dieser Einheit die Fachlehrkräfte sind) */}
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
          </section>
        )}

      </div>
    </div>
  );
}