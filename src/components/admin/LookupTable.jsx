import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';

/**
 * Generische CRUD-Tabelle für Lookup-Einträge.
 *
 * Props:
 *  entityName      — z.B. 'LookupFaecher'
 *  queryKey        — z.B. ['lookupFaecher']
 *  items           — Array der Einträge (roh, inkl. inaktiver)
 *  labelField      — Feldname für den Anzeigetext (z.B. 'name' oder 'bezeichnung')
 *  extraFields     — optionale zusätzliche Felder zum Anzeigen (z.B. [{key:'kategorie', label:'Kategorie'}])
 *  createDefaults  — Default-Werte beim Anlegen neuer Einträge
 *  renderExtra     — optionale Render-Funktion für Extrafelder im Create-Formular
 */
export default function LookupTable({
  entityName,
  queryKey,
  items,
  labelField = 'name',
  extraFields = [],
  createDefaults = {},
  renderExtra,
}) {
  const queryClient = useQueryClient();
  const entity = base44.entities[entityName];

  const [newLabel, setNewLabel]   = useState('');
  const [newExtra, setNewExtra]   = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (data) => entity.create(data),
    onSuccess: () => { invalidate(); setNewLabel(''); setNewExtra({}); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entity.update(id, data),
    onSuccess: () => { invalidate(); setEditingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entity.delete(id),
    onSuccess: invalidate,
  });

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    createMutation.mutate({
      [labelField]: newLabel.trim(),
      ist_aktiv: true,
      reihenfolge: (items.length + 1) * 10,
      ...createDefaults,
      ...newExtra,
    });
  };

  const handleToggleAktiv = (item) => {
    updateMutation.mutate({ id: item.id, data: { ist_aktiv: !item.ist_aktiv } });
  };

  const handleSaveEdit = (item) => {
    updateMutation.mutate({ id: item.id, data: { [labelField]: editLabel.trim() } });
  };

  return (
    <div className="space-y-3">
      {/* Neue Einträge */}
      <div className="flex gap-2">
        <Input
          placeholder="Neuer Eintrag…"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        {renderExtra && renderExtra(newExtra, setNewExtra)}
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!newLabel.trim() || createMutation.isPending}
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />Hinzufügen
        </Button>
      </div>

      {/* Eintrags-Liste */}
      <div className="border rounded-lg divide-y overflow-hidden">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Noch keine Einträge.</p>
        )}
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
              item.ist_aktiv === false ? 'bg-muted/40 opacity-60' : 'bg-background hover:bg-muted/30'
            }`}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />

            {editingId === item.id ? (
              <>
                <Input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item)}
                  className="flex-1 h-7 text-sm"
                  autoFocus
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveEdit(item)}>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                <button
                  className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => { setEditingId(item.id); setEditLabel(item[labelField]); }}
                >
                  {item[labelField]}
                </button>
                {extraFields.map(ef => (
                  <Badge key={ef.key} variant="secondary" className="text-[10px] shrink-0">
                    {item[ef.key] || '—'}
                  </Badge>
                ))}
              </>
            )}

            <Switch
              checked={item.ist_aktiv !== false}
              onCheckedChange={() => handleToggleAktiv(item)}
              className="shrink-0"
              title={item.ist_aktiv !== false ? 'Aktiv – klicken zum Deaktivieren' : 'Inaktiv – klicken zum Aktivieren'}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => deleteMutation.mutate(item.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {items.filter(i => i.ist_aktiv !== false).length} aktiv · {items.filter(i => i.ist_aktiv === false).length} inaktiv
      </p>
    </div>
  );
}