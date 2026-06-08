/**
 * SystemBausteineTable.jsx
 *
 * Admin-CRUD für globale Systembausteine (Pool im Lernpfad-Architekt, Tab 8).
 * - Inline-Anlegen oben (baustein_id, titel, icon, typ).
 * - Liste mit Hoch/Runter-Pfeilen (Reihenfolge), Aktiv-Toggle und Lösch-Button.
 * - Bearbeiten via Modal (titel, icon, admin_beschreibung, export_instruktion).
 *
 * Zwei Arten von Systembausteinen (Feld `typ`):
 *   - 'baustein' = normaler, atomarer Systembaustein.
 *   - 'buendel'  = besondere Container-Art (1:n), nimmt andere Bausteine/
 *                  Aufgaben auf. In der Liste deutlich als „Bündel" markiert.
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pencil, Loader2, ChevronUp, ChevronDown, Boxes } from 'lucide-react';
import { toast } from 'sonner';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';
import IconKeySelect from '@/components/admin/IconKeySelect';

const QUERY_KEY = ['systemBausteine'];

function BausteinIcon({ iconKey, className = 'w-4 h-4' }) {
  const Icon = getSystemBausteinIcon(iconKey);
  return <Icon className={className} />;
}

// Bündel-Erkennung: bevorzugt das neue Feld `typ`, fällt für Altbestände auf
// das Spiegel-Feld `baustein_modus` zurück.
function istBuendel(item) {
  return item?.typ === 'buendel' || item?.baustein_modus === 'bundle_1ton';
}

export default function SystemBausteineTable() {
  const queryClient = useQueryClient();
  const [newId, setNewId] = useState('');
  const [newTitel, setNewTitel] = useState('');
  const [newIcon, setNewIcon] = useState('sparkles');
  const [newTyp, setNewTyp] = useState('baustein');
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
      setNewTyp('baustein');
      toast.success('Systembaustein angelegt.');
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

  // Reihenfolge-Tausch zwischen zwei benachbarten Bausteinen. Wir tauschen die
  // `reihenfolge`-Werte und speichern beide.
  const swapMutation = useMutation({
    mutationFn: async ({ a, b }) => {
      await base44.entities.SystemBausteine.update(a.id, { reihenfolge: b.reihenfolge });
      await base44.entities.SystemBausteine.update(b.id, { reihenfolge: a.reihenfolge });
    },
    onSuccess: invalidate,
    onError: (err) => toast.error('Fehler beim Sortieren: ' + (err?.message || 'Unbekannt')),
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
      typ: newTyp,
      baustein_modus: newTyp === 'buendel' ? 'bundle_1ton' : 'static',
      ist_aktiv: true,
      reihenfolge: (items.length + 1) * 10,
    });
  };

  // Ein Baustein im sortierten Array nach oben/unten verschieben.
  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    swapMutation.mutate({ a: items[index], b: items[target] });
  };

  return (
    <div className="space-y-4">
      {/* Anlegen */}
      <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_130px_130px_auto] gap-2 items-end">
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
          <Label className="text-xs">Art</Label>
          <Select value={newTyp} onValueChange={setNewTyp}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baustein">Systembaustein</SelectItem>
              <SelectItem value="buendel">Bündel</SelectItem>
            </SelectContent>
          </Select>
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
            Noch keine Systembausteine. Lege oben einen neuen Baustein an.
          </p>
        ) : (
          items.map((item, index) => {
            const bundle = istBuendel(item);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  item.ist_aktiv === false
                    ? 'bg-muted/40 opacity-60'
                    : bundle
                      ? 'bg-bundle-soft/40 hover:bg-bundle-soft/70'
                      : 'bg-background hover:bg-muted/30'
                }`}
              >
                {/* Sortier-Pfeile */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || swapMutation.isPending}
                    className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Nach oben"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1 || swapMutation.isPending}
                    className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Nach unten"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    bundle
                      ? 'bg-bundle text-bundle-foreground border-bundle'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <BausteinIcon
                    iconKey={item.icon}
                    className={`w-4 h-4 ${bundle ? 'text-bundle-foreground' : 'text-slate-700'}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{item.titel}</p>
                    {bundle && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bundle bg-bundle-soft border border-bundle-border rounded-full px-1.5 py-0.5 shrink-0">
                        <Boxes className="w-3 h-3" /> Bündel
                      </span>
                    )}
                  </div>
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
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {items.filter((i) => !istBuendel(i)).length} Bausteine ·{' '}
        {items.filter((i) => istBuendel(i)).length} Bündel ·{' '}
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
  const bundle = istBuendel(baustein);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BausteinIcon iconKey={icon} className="w-4 h-4" />
            {bundle ? 'Bündel bearbeiten' : 'Systembaustein bearbeiten'}
            {bundle && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bundle bg-bundle-soft border border-bundle-border rounded-full px-1.5 py-0.5">
                <Boxes className="w-3 h-3" /> Bündel
              </span>
            )}
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