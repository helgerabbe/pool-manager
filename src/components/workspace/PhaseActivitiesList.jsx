import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, AlertTriangle, GripVertical, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function PhaseActivitiesList({
  paket,
  phase,
  kannBearbeiten,
  onSelectActivity,
  onGoToTaskWorkshop = null,
  lernziele = [],
}) {
  const queryClient = useQueryClient();
  const [newActivityId, setNewActivityId] = useState('');

  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', paket.id, phase],
    queryFn: () =>
      base44.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: paket.id,
        phase,
      }),
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const createAktivitaet = useMutation({
    mutationFn: (aktivitaetId) =>
      base44.entities.LernpaketPhaseAktivitaet.create({
        lernpaket_id: paket.id,
        phase,
        aktivitaet_id: aktivitaetId,
        field_values: {},
        is_complete: false,
        reihenfolge: aktivitaeten.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['lernpaketPhaseAktivitaeten'],
      });
      setNewActivityId('');
      toast.success('Aktivität hinzugefügt.');
    },
    onError: () => toast.error('Fehler beim Hinzufügen.'),
  });

  const deleteAktivitaet = useMutation({
    mutationFn: (id) =>
      base44.entities.LernpaketPhaseAktivitaet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['lernpaketPhaseAktivitaeten'],
      });
      toast.success('Aktivität entfernt.');
    },
    onError: () => toast.error('Fehler beim Löschen.'),
  });

  const phaseMappings = {
    Input: ['Input', 'Input (Erarbeitung)'],
    Übung: ['Übung'],
    Abschluss: ['Abschluss'],
  };
  const phaseAktivitaeten = aktivitaetenKatalog.filter(a =>
    phaseMappings[phase]?.includes(a.phase) && a.is_active
  );

  if (aktivitaeten.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
        <p className="text-sm text-muted-foreground italic">
          Keine Aktivitäten zugeordnet
        </p>
        {kannBearbeiten && (
          <div className="space-y-2">
            <Label className="text-xs">Aktivität hinzufügen</Label>
            <select
              value={newActivityId}
              onChange={(e) => {
                if (e.target.value) {
                  createAktivitaet.mutate(e.target.value);
                }
              }}
              className="w-full px-2 py-1.5 text-sm rounded-lg border border-input bg-white"
            >
              <option value="">-- Aktivität wählen --</option>
              {phaseAktivitaeten.map((akt) => (
                <option key={akt.id} value={akt.id}>
                  {akt.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {aktivitaeten
        .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
        .map((activity) => {
          const katalog = aktivitaetenKatalog.find(a => a.id === activity.aktivitaet_id);
          return (
            <div
              key={activity.id}
              className="p-3 rounded-lg bg-white border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="font-medium text-sm">{katalog?.name || '…'}</p>
                    {!activity.is_complete && (
                      <span title="Inhalt unvollständig" className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Unvollständig
                      </span>
                    )}
                  </div>
                  {katalog?.form_schema && katalog.form_schema.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {katalog.form_schema.length} Felder
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {kannBearbeiten && (
                    <>
                      {onGoToTaskWorkshop && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                          onClick={() => onGoToTaskWorkshop(activity.id)}
                          title="Zu Aufgaben-Werkstatt wechseln"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Aufgaben
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() =>
                          onSelectActivity({
                            paketId: paket.id,
                            phaseKey: phase,
                            activityId: activity.id,
                          })
                        }
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteAktivitaet.mutate(activity.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              

            </div>
          );
        })}

      {kannBearbeiten && (
        <div className="space-y-2">
          <Label className="text-xs">Weitere Aktivität hinzufügen</Label>
          <select
            value={newActivityId}
            onChange={(e) => {
              if (e.target.value) {
                createAktivitaet.mutate(e.target.value);
              }
            }}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-input bg-white"
          >
            <option value="">-- Aktivität wählen --</option>
            {phaseAktivitaeten.map((akt) => (
              <option key={akt.id} value={akt.id}>
                {akt.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}