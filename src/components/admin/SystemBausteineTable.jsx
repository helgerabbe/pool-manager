/**
 * SystemBausteineTable.jsx
 *
 * Admin-CRUD für globale System-Bausteine (Tab 7-Standardelemente).
 * - Inline-Anlegen oben (baustein_id, titel, icon).
 * - Liste mit Aktiv-Toggle und Lösch-Button.
 * - Bearbeiten via Modal (vier Felder: titel, icon, admin_beschreibung, export_instruktion).
 *
 * Sicherheit: Schreibend nur für Admins (durchgesetzt durch RLS auf der
 * Entität). Diese Komponente wird ohnehin nur im Admin-Bereich gemountet.
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import IconKeySelect from '@/components/admin/IconKeySelect';

const QUERY_KEY = ['systemBausteine'];

function BausteinIcon({ iconKey, className = 'w-4 h-4' }) {
  const Icon = getSystemBausteinIcon(iconKey);
  return <Icon className={className} />;
}

export default function SystemBausteineTable() {
  const queryClient = useQueryClient();
  const [newId, setNewId] = useState('');
  const [newTitel, setNewTitel] = useState('');
  const [newIcon, setNewIcon] = useState('sparkles');
  const [editing, setEditing] = useState(null); // SystemBausteine | null

  const { data: items = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => base44.entities.SystemBausteine.list('reihenfolge'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemBausteine.create(data),
    onSuccess: () => {
      invalidate();
      setNewId('');
      setNewTitel('');
      setNewIcon('sparkles');
      toast.success('System-Baustein angelegt.');
    },
    onError: (err) => toast.error('Fehler: ' + (err?.message || 'Unbekannt')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SystemBausteine.update(id, data),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success('Gespeichert.');
    },
    onError: (err) => toast.error('Fehler: ' + (err?.message || 'Unbekannt')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SystemBausteine.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success('Gelöscht.');
    },
    onError: (err) => toast.error('Fehler: ' + (err?.message || 'Unbekannt')),
  });

  const handleCreate = () => {
    const id = newId.trim();
    const titel = newTitel.trim();
    if (!id || !titel) {
      toast.error('ID und Titel sind Pflichtfelder.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(id)) {
      toast.error('ID darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten.');
      return;
    }
    if (items.some((b) => b.baustein_id === id)) {
      toast.error(`ID "${id}" existiert bereits.`);
      return;
    }
    createMutation.mutate({
      baustein_id: id,
      titel,
      icon: newIcon || 'sparkles',
      ist_aktiv: true,
      reihenfolge: (items.length + 1) * 10,
    });
  };

  return (
    <div className="space-y-4">
      {/* Anlegen */}
      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_140px_auto] gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">ID</Label>
          <Input
            placeholder="sys_xyz"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Titel</Label>
          <Input
            placeholder="Anzeigetitel"
            value={newTitel}
            onChange={(e) => setNewTitel(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Symbol</Label>
          <IconKeySelect value={newIcon} onChange={setNewIcon} />
        </div>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={createMutation.isPending || !newId.trim() || !newTitel.trim()}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Hinzufügen
        </Button>
      </div>

      {/* Liste */}
      <div className="border rounded-lg divide-y overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Noch keine System-Bausteine. Lege oben einen neuen Baustein an.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                item.ist_aktiv === false ? 'bg-muted/40 opacity-60' : 'bg-background hover:bg-muted/30'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <BausteinIcon iconKey={item.icon} className="w-4 h-4 text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.titel}</p>
                <p className="text-[11px] font-mono text-muted-foreground truncate">{item.baustein_id}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditing(item)}
                title="Bearbeiten"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Switch
                checked={item.ist_aktiv !== false}
                onCheckedChange={(v) => updateMutation.mutate({ id: item.id, data: { ist_aktiv: v } })}
                className="shrink-0"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  if (confirm(`„${item.titel}" wirklich löschen?`)) deleteMutation.mutate(item.id);
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {items.filter((i) => i.ist_aktiv !== false).length} aktiv ·{' '}
        {items.filter((i) => i.ist_aktiv === false).length} inaktiv
      </p>

      {editing && (
        <EditDialog
          baustein={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateMutation.mutate({ id: editing.id, data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditDialog({ baustein, onClose, onSave, isPending }) {
  const [titel, setTitel] = useState(baustein.titel || '');
  const [icon, setIcon] = useState(baustein.icon || 'sparkles');
  const [adminBeschreibung, setAdminBeschreibung] = useState(baustein.admin_beschreibung || '');
  const [exportInstruktion, setExportInstruktion] = useState(baustein.export_instruktion || '');

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BausteinIcon iconKey={icon} className="w-4 h-4" />
            System-Baustein bearbeiten
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">ID (nicht änderbar)</Label>
            <Input value={baustein.baustein_id} disabled className="h-8 text-xs font-mono mt-1" />
          </div>
          <div>
            <Label className="text-xs">Titel</Label>
            <Input value={titel} onChange={(e) => setTitel(e.target.value)} className="h-8 text-xs mt-1" />
          </div>
          <div>
            <Label className="text-xs">Symbol</Label>
            <div className="mt-1">
              <IconKeySelect value={icon} onChange={setIcon} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Admin-Beschreibung (Tooltip)</Label>
            <Textarea
              value={adminBeschreibung}
              onChange={(e) => setAdminBeschreibung(e.target.value)}
              className="text-xs mt-1 min-h-[60px]"
              placeholder="Kurzer Hinweistext für Lehrkräfte."
            />
          </div>
          <div>
            <Label className="text-xs">Export-Instruktion (Moodle/Brian)</Label>
            <Textarea
              value={exportInstruktion}
              onChange={(e) => setExportInstruktion(e.target.value)}
              className="text-xs mt-1 min-h-[80px]"
              placeholder="Klartext, der bei Export 1:1 als Inhalt erscheint."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={() =>
              onSave({
                titel: titel.trim(),
                icon: icon.trim() || 'sparkles',
                admin_beschreibung: adminBeschreibung.trim(),
                export_instruktion: exportInstruktion.trim(),
              })
            }
            disabled={isPending || !titel.trim()}
            className="gap-1.5"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}