/**
 * EinheitSettingsModal
 * ────────────────────
 * Zwei-Tab-Modal für Einheiten-Einstellungen:
 *   Tab 1 "Allgemein"  — Metadaten bearbeiten (Titel, Fach, Jahrgang, Zeitraum)
 *   Tab 2 "Team"       — Mitgliederverwaltung (nur für LEITUNG dieser Einheit)
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Users, Save, Plus, Trash2, Crown, Edit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FAECHER = ["Deutsch","Mathematik","Englisch","Französisch","Latein","Biologie","Chemie","Physik","Geschichte","Geographie","Politik","Wirtschaft","Kunst","Musik","Sport","Religion","Ethik","Informatik"];
const JAHRGANGSSTUFEN = ["5","6","7","8","9","10","11","12","13"];

const UNIT_ROLE_CONFIG = {
  LEITUNG: { label: 'Leitung', color: 'bg-amber-100 text-amber-700 border-amber-200', Icon: Crown },
  EDITOR:  { label: 'Editor',  color: 'bg-blue-100 text-blue-700 border-blue-200',   Icon: Edit  },
  READER:  { label: 'Leser',   color: 'bg-slate-100 text-slate-600 border-slate-200', Icon: Eye  },
};

function UnitRoleBadge({ role, size = 'sm' }) {
  const cfg = UNIT_ROLE_CONFIG[role] || UNIT_ROLE_CONFIG.READER;
  const Icon = cfg.Icon;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 border rounded-full font-medium',
      size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      cfg.color
    )}>
      <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {cfg.label}
    </span>
  );
}

// ── Tab 1: Allgemein ──────────────────────────────────────────────────────────

function TabAllgemein({ einheit, onSave, isSaving }) {
  const [form, setForm] = useState({
    titel_der_einheit: einheit.titel_der_einheit || '',
    gesamtziel:        einheit.gesamtziel || '',
    fach:              einheit.fach || '',
    jahrgangsstufe:    einheit.jahrgangsstufe || '',
    freigabe_status:   einheit.freigabe_status || 'In Planung',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <Label>Titel der Einheit</Label>
        <Input value={form.titel_der_einheit} onChange={e => set('titel_der_einheit', e.target.value)} placeholder="z.B. Quadratische Gleichungen" />
      </div>

      <div className="space-y-1.5">
        <Label>Gesamtziel der Einheit</Label>
        <textarea
          value={form.gesamtziel}
          onChange={e => set('gesamtziel', e.target.value)}
          placeholder="Beschreiben Sie hier kurz das übergeordnete Ziel dieser Einheit (z.B. Was ist die Kernkompetenz am Ende?)..."
          className="w-full px-3 py-2 border rounded-lg text-sm min-h-20 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Fach</Label>
          <Select value={form.fach} onValueChange={v => set('fach', v)}>
            <SelectTrigger><SelectValue placeholder="Fach wählen" /></SelectTrigger>
            <SelectContent>
              {FAECHER.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Jahrgangsstufe</Label>
          <Select value={form.jahrgangsstufe} onValueChange={v => set('jahrgangsstufe', v)}>
            <SelectTrigger><SelectValue placeholder="Jahrgang" /></SelectTrigger>
            <SelectContent>
              {JAHRGANGSSTUFEN.map(j => <SelectItem key={j} value={j}>Jg. {j}</SelectItem>)}
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

      <div className="pt-2 flex justify-end">
        <Button onClick={() => onSave(form)} disabled={isSaving || !form.titel_der_einheit || !form.fach || !form.jahrgangsstufe} className="gap-2">
          {isSaving
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Save className="w-4 h-4" />}
          Änderungen speichern
        </Button>
      </div>
    </div>
  );
}

// ── Tab 2: Team ───────────────────────────────────────────────────────────────

function TabTeam({ einheitId, currentUserEmail, isLeitung }) {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail]   = useState('');
  const [newRole, setNewRole]     = useState('EDITOR');
  const [adding, setAdding]       = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['einheit-members', einheitId],
    queryFn: () => base44.entities.EinheitMembers.filter({ einheit_id: einheitId }),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isLeitung,
  });

  const addMember = useMutation({
    mutationFn: async ({ email, role }) => {
      // Existing member? → update role
      const existing = members.find(m => m.user_email === email);
      if (existing) {
        return base44.entities.EinheitMembers.update(existing.id, { unit_role: role });
      }
      const user = allUsers.find(u => u.email === email);
      return base44.entities.EinheitMembers.create({
        einheit_id: einheitId,
        user_email: email,
        user_name: user?.full_name || email,
        unit_role: role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheitId] });
      setNewEmail('');
      setNewRole('EDITOR');
      setAdding(false);
      toast.success('Mitglied hinzugefügt.');
    },
    onError: () => toast.error('Fehler beim Hinzufügen.'),
  });

  const removeMember = useMutation({
    mutationFn: (memberId) => base44.entities.EinheitMembers.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['einheit-members', einheitId] });
      toast.success('Mitglied entfernt.');
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ memberId, role }) => base44.entities.EinheitMembers.update(memberId, { unit_role: role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['einheit-members', einheitId] }),
  });

  const availableUsers = allUsers.filter(u => !members.find(m => m.user_email === u.email));

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pt-2">
      {/* Member list */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">Noch keine Mitglieder zugewiesen.</p>
        ) : (
          members.map(m => {
            const isMe = m.user_email === currentUserEmail;
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {(m.user_name || m.user_email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user_name || m.user_email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user_email}</p>
                </div>
                {isLeitung && !isMe ? (
                  <Select value={m.unit_role} onValueChange={v => updateRole.mutate({ memberId: m.id, role: v })}>
                    <SelectTrigger className="w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
                    title="Mitglied entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {isMe && <span className="text-[10px] text-muted-foreground italic shrink-0">Ich</span>}
              </div>
            );
          })
        )}
      </div>

      {/* Add member */}
      {isLeitung && (
        <div className="border-t pt-4">
          {!adding ? (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="gap-2 w-full">
              <Plus className="w-3.5 h-3.5" /> Mitglied hinzufügen
            </Button>
          ) : (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-semibold text-muted-foreground">Neues Mitglied</p>
              {availableUsers.length > 0 ? (
                <Select value={newEmail} onValueChange={setNewEmail}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Nutzer auswählen…" />
                  </SelectTrigger>
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
                <Input
                  placeholder="E-Mail-Adresse…"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="text-sm"
                />
              )}
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEITUNG">Leitung</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                  <SelectItem value="READER">Leser</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewEmail(''); }} className="flex-1">Abbrechen</Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  disabled={!newEmail || addMember.isPending}
                  onClick={() => addMember.mutate({ email: newEmail, role: newRole })}
                >
                  <Plus className="w-3.5 h-3.5" /> Hinzufügen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function EinheitSettingsModal({ open, onOpenChange, einheit, currentUserEmail }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: myMembership } = useQuery({
    queryKey: ['einheit-members', einheit?.id, currentUserEmail],
    queryFn: () => base44.entities.EinheitMembers.filter({ einheit_id: einheit?.id, user_email: currentUserEmail }),
    enabled: !!einheit?.id && !!currentUserEmail,
    select: data => data[0],
  });

  // LEITUNG = explizite Mitglied-Rolle ODER Ersteller der Einheit
  const isLeitung = myMembership?.unit_role === 'LEITUNG' || einheit?.created_by === currentUserEmail;

  const handleSaveMetadata = async (formData) => {
    setIsSaving(true);
    await base44.entities.Einheiten.update(einheit.id, formData);
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    setIsSaving(false);
    toast.success('Einheit gespeichert.');
    onOpenChange(false);
  };

  if (!einheit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            Einstellungen
            <span className="text-muted-foreground font-normal text-sm truncate max-w-[220px]">· {einheit.titel_der_einheit}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="allgemein">
          <TabsList className="w-full">
            <TabsTrigger value="allgemein" className="flex-1 gap-1.5">
              <Settings className="w-3.5 h-3.5" /> Allgemein
            </TabsTrigger>
            <TabsTrigger value="team" className="flex-1 gap-1.5">
              <Users className="w-3.5 h-3.5" /> Team
              {!isLeitung && <span className="text-[9px] text-muted-foreground ml-1">(lesend)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="allgemein">
            <TabAllgemein einheit={einheit} onSave={handleSaveMetadata} isSaving={isSaving} />
          </TabsContent>

          <TabsContent value="team">
            <TabTeam einheitId={einheit.id} currentUserEmail={currentUserEmail} isLeitung={isLeitung} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Re-export badge for use elsewhere
export { UnitRoleBadge };