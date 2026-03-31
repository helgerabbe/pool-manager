import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PHASEN = [
  { key: 'Input', label: 'Erarbeitung', color: 'border-blue-300 bg-blue-50' },
  { key: 'Übung', label: 'Übung', color: 'border-green-300 bg-green-50' },
  { key: 'Abschluss', label: 'Abschluss', color: 'border-purple-300 bg-purple-50' },
];

export default function LernpaketDetail({ lernpaketId, onSave }) {
  const queryClient = useQueryClient();
  const [phasenState, setPhasenState] = useState({
    Input: { disabled: false, selected_aktivitaet_id: '', field_values: {} },
    Übung: { disabled: false, selected_aktivitaet_id: '', field_values: {} },
    Abschluss: { disabled: false, selected_aktivitaet_id: '', field_values: {} },
  });

  // Lade Lernpaket-Daten
  const { data: lernpaket, isLoading: lernpaketLoading } = useQuery({
    queryKey: ['lernpaket', lernpaketId],
    queryFn: async () => {
      const paket = await base44.entities.Lernpakete.list();
      return paket.find((p) => p.id === lernpaketId);
    },
    enabled: !!lernpaketId,
  });

  // Lade Aktivitätenkatalog
  const { data: aktivitaeten, isLoading: aktivitaetenLoading } = useQuery({
    queryKey: ['aktivitaeten'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  // Lade initial die Phasen-Konfiguration vom Lernpaket
  useEffect(() => {
    if (lernpaket?.phasen_konfiguration) {
      setPhasenState(lernpaket.phasen_konfiguration);
    }
  }, [lernpaket]);

  // Mutation zum Speichern
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Lernpakete.update(lernpaketId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaket', lernpaketId] });
      toast.success('Phasenkonfiguration gespeichert');
      onSave?.();
    },
    onError: (err) => {
      toast.error('Fehler beim Speichern: ' + err.message);
    },
  });

  const handleToggle = (phase) => {
    setPhasenState((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        disabled: !prev[phase].disabled,
      },
    }));
  };

  const handleActivitySelect = (phase, aktivitaetId) => {
    setPhasenState((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        selected_aktivitaet_id: aktivitaetId,
      },
    }));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      phasen_konfiguration: phasenState,
    });
  };

  // Gruppiere Aktivitäten nach Phase
  const aktivitaetenByPhase = {};
  PHASEN.forEach((p) => {
    aktivitaetenByPhase[p.key] = aktivitaeten?.filter((a) => a.phase === p.key) || [];
  });

  if (lernpaketLoading || aktivitaetenLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Titel */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">{lernpaket?.titel_des_pakets}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurieren Sie die Aktivitäten für jede Lernphase
        </p>
      </div>

      {/* Phasen-Container */}
      <div className="space-y-4">
        {PHASEN.map((phase) => {
          const state = phasenState[phase.key];
          const aktivs = aktivitaetenByPhase[phase.key];
          const selectedAktivitaet = aktivs.find((a) => a.id === state.selected_aktivitaet_id);

          return (
            <Card
              key={phase.key}
              className={cn(
                'border-2 transition-all',
                state.disabled ? 'opacity-50 bg-muted/30' : phase.color
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{phase.label}</CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-medium">Aktivieren</span>
                    <Switch
                      checked={!state.disabled}
                      onCheckedChange={() => handleToggle(phase.key)}
                    />
                  </div>
                </div>
              </CardHeader>

              {!state.disabled && (
                <CardContent className="space-y-4">
                  {/* Aktivitäts-Dropdown */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Aktivität wählen</label>
                    <Select
                      value={state.selected_aktivitaet_id || ''}
                      onValueChange={(value) => handleActivitySelect(phase.key, value)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={`Wähle eine Aktivität für ${phase.label}…`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {aktivs.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Keine Aktivitäten verfügbar
                          </div>
                        ) : (
                          aktivs.map((akt) => (
                            <SelectItem key={akt.id} value={akt.id}>
                              {akt.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Form-Schema Platzhalter */}
                  {selectedAktivitaet?.form_schema && selectedAktivitaet.form_schema.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <ChevronDown className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">
                            {selectedAktivitaet.form_schema.length} Konfigurationsfeld(er)
                          </p>
                          <p className="text-xs mt-1">
                            Formularfelder werden im nächsten Schritt implementiert
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedAktivitaet?.form_schema?.length === 0 && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-xs text-green-700">
                        ✓ Diese Aktivität benötigt keine weitere Konfiguration
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Speichern-Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Abbrechen
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="gap-2"
        >
          {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}