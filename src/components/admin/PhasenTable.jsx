import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function PhasenTable({ items }) {
  const queryClient = useQueryClient();
  const entity = base44.entities.LookupPhasen;

  const [form, setForm] = useState({ bezeichnung: '', startdatum: '', enddatum: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['lookupPhasen'] });

  const createMutation = useMutation({
    mutationFn: (data) => entity.create(data),
    onSuccess: () => { invalidate(); setForm({ bezeichnung: '', startdatum: '', enddatum: '' }); },
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
    if (!form.bezeichnung.trim()) return;
    createMutation.mutate({ ...form, ist_aktiv: true });
  };

  return (
    <div className="space-y-3">
      {/* Neue Phase */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_auto] gap-2">
        <Input
          placeholder="Bezeichnung (z.B. Halbjahr 1 2025/26)"
          value={form.bezeichnung}
          onChange={e => setForm({ ...form, bezeichnung: e.target.value })}
        />
        <Input
          type="date"
          value={form.startdatum}
          onChange={e => setForm({ ...form, startdatum: e.target.value })}
          className="text-sm"
        />
        <Input
          type="date"
          value={form.enddatum}
          onChange={e => setForm({ ...form, enddatum: e.target.value })}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!form.bezeichnung.trim() || createMutation.isPending}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />Hinzufügen
        </Button>
      </div>

      {/* Liste */}
      <div className="border rounded-lg divide-y overflow-hidden">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Noch keine Phasen angelegt.</p>
        )}
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              item.ist_aktiv === false ? 'bg-muted/40 opacity-60' : 'bg-background hover:bg-muted/30'
            }`}
          >
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />

            {editingId === item.id ? (
              <>
                <Input
                  value={editForm.bezeichnung}
                  onChange={e => setEditForm({ ...editForm, bezeichnung: e.target.value })}
                  className="flex-1 h-7 text-sm"
                  autoFocus
                />
                <Input
                  type="date"
                  value={editForm.startdatum || ''}
                  onChange={e => setEditForm({ ...editForm, startdatum: e.target.value })}
                  className="w-36 h-7 text-xs"
                />
                <Input
                  type="date"
                  value={editForm.enddatum || ''}
                  onChange={e => setEditForm({ ...editForm, enddatum: e.target.value })}
                  className="w-36 h-7 text-xs"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => updateMutation.mutate({ id: item.id, data: editForm })}>
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
                  onClick={() => { setEditingId(item.id); setEditForm({ bezeichnung: item.bezeichnung, startdatum: item.startdatum || '', enddatum: item.enddatum || '' }); }}
                >
                  {item.bezeichnung}
                </button>
                {item.startdatum && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {format(new Date(item.startdatum), 'dd.MM.yy', { locale: de })} – {item.enddatum ? format(new Date(item.enddatum), 'dd.MM.yy', { locale: de }) : '?'}
                  </Badge>
                )}
              </>
            )}

            <Switch
              checked={item.ist_aktiv !== false}
              onCheckedChange={() => updateMutation.mutate({ id: item.id, data: { ist_aktiv: !item.ist_aktiv } })}
              className="shrink-0"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => deleteMutation.mutate(item.id)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}