import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Edit, Clock } from 'lucide-react';

export default function ThemenfeldPanel({
  themenfeld,
  lernpakete,
  kannBearbeiten,
  queryClient,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    titel: themenfeld?.titel || '',
    beschreibung: themenfeld?.beschreibung || '',
    bearbeitungsmodus: themenfeld?.bearbeitungsmodus || 'offen',
  });

  const updateThemenfeld = useMutation({
    mutationFn: (data) => base44.entities.Themenfeld.update(themenfeld.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themenfelder'] });
      setIsEditing(false);
    },
    onError: () => toast.error('Fehler beim Speichern des Themenfelds.'),
  });

  const paketeFuerThemenfeld = lernpakete.filter(
    (p) => p.themenfeld_id === themenfeld?.id
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{themenfeld?.titel}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {paketeFuerThemenfeld.length} Lernpaket
            {paketeFuerThemenfeld.length !== 1 ? 'e' : ''}
          </p>
        </div>
        {kannBearbeiten && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="gap-2"
          >
            <Edit className="w-4 h-4" /> {isEditing ? 'Abbrechen' : 'Bearbeiten'}
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Beschreibung
            </p>
            <p className="text-sm">
              {themenfeld?.beschreibung || (
                <span className="text-muted-foreground italic">
                  Keine Beschreibung
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Bearbeitungsmodus
            </p>
            <Badge
              variant={
                themenfeld?.bearbeitungsmodus === 'sequenziell'
                  ? 'default'
                  : 'secondary'
              }
            >
              {themenfeld?.bearbeitungsmodus === 'sequenziell'
                ? 'Sequenziell'
                : 'Offen'}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-4 rounded-lg border bg-card">
          <div className="space-y-2">
            <Label>Titel</Label>
            <input
              type="text"
              value={form.titel}
              onChange={(e) => setForm({ ...form, titel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-input"
              placeholder="Themenfeld-Titel"
            />
          </div>
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <textarea
              value={form.beschreibung}
              onChange={(e) =>
                setForm({ ...form, beschreibung: e.target.value })
              }
              className="w-full max-w-full px-3 py-2 rounded-lg border border-input min-h-20 resize-none"
              placeholder="Kurzbeschreibung des Themenfelds"
            />
          </div>
          <div className="space-y-2">
            <Label>Bearbeitungsmodus</Label>
            <select
              value={form.bearbeitungsmodus}
              onChange={(e) =>
                setForm({ ...form, bearbeitungsmodus: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-input"
            >
              <option value="offen">Offen</option>
              <option value="sequenziell">Sequenziell</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => updateThemenfeld.mutate(form)}
              disabled={updateThemenfeld.isPending}
              className="flex-1 gap-2"
            >
              {updateThemenfeld.isPending && (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Speichern
            </Button>
          </div>
        </div>
      )}

      {paketeFuerThemenfeld.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Lernpakete in diesem Themenfeld
          </h3>
          <div className="space-y-2">
            {paketeFuerThemenfeld.map((paket) => (
              <div
                key={paket.id}
                className="p-3 rounded-lg border bg-card flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {paket.titel_des_pakets}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {paket.geschaetzte_dauer_minuten} Min.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}