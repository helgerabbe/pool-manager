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
import DynamicFieldRenderer from './DynamicFieldRenderer';

const PHASEN = [
  { key: 'Input', label: 'Erarbeitung', color: 'border-blue-300 bg-blue-50' },
  { key: 'Übung', label: 'Übung', color: 'border-green-300 bg-green-50' },
  { key: 'Abschluss', label: 'Abschluss', color: 'border-purple-300 bg-purple-50' },
];

export default function LernpaketDetail({ lernpaketId, einheitId, onSave }) {
  const queryClient = useQueryClient();
  const [phasenState, setPhasenState] = useState({
    Input: { is_active: true, selected_aktivitaet_id: '', meta_data: {} },
    Übung: { is_active: true, selected_aktivitaet_id: '', meta_data: {} },
    Abschluss: { is_active: true, selected_aktivitaet_id: '', meta_data: {} },
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

  // Lade Lernziele für Multiselect (KI-Check)
  const { data: lernziele } = useQuery({
    queryKey: ['lernziele', einheitId],
    queryFn: async () => {
      const pakete = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
      const ziele = [];
      for (const paket of pakete) {
        const paketZiele = await base44.entities.Lernziele.filter({ lernpaket_id: paket.id });
        ziele.push(...paketZiele);
      }
      return ziele;
    },
    enabled: !!einheitId,
  });

  // Lade initial die Phasen-Konfiguration vom Lernpaket
  useEffect(() => {
    if (lernpaket?.phasen_konfiguration) {
      setPhasenState(lernpaket.phasen_konfiguration);
    }
  }, [lernpaket]);

  // Handler für Metadaten-Änderungen
  const handleMetaDataChange = (phase, fieldName, value) => {
    setPhasenState((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        meta_data: {
          ...prev[phase].meta_data,
          [fieldName]: value,
        },
      },
    }));
  };

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
        is_active: !prev[phase].is_active,
      },
    }));
  };

  const handleActivitySelect = (phase, aktivitaetId) => {
    setPhasenState((prev) => ({
      ...prev,
      [phase]: {
        ...prev[phase],
        selected_aktivitaet_id: aktivitaetId,
        meta_data: {}, // Reset meta_data bei Aktivitätswechsel
      },
    }));
  };

  const handleSave = async () => {
    // Struktur für Backend anpassen: phasen_konfiguration mit Input/Übung/Abschluss Keys
    const phasenKonfiguration = {
      Input: phasenState.Input,
      Übung: phasenState.Übung,
      Abschluss: phasenState.Abschluss,
    };
    
    await updateMutation.mutateAsync({
      phasen_konfiguration: phasenKonfiguration,
    });
  };

  // Gruppiere Aktivitäten nach Phase
  const aktivitaetenByPhase = {};
  PHASEN.forEach((p) => {
    aktivitaetenByPhase[p.key] = aktivitaeten?.filter((a) => a.phase === p.key) || [];
  });

  // Multiselect-Optionen für Lernziele (KI-Check)
  const multiSelectLernziele =
    lernziele?.map((z) => ({
      id: z.id,
      label: z.formulierung_fachsprache,
      description: z.schueler_uebersetzung,
    })) || [];

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
                      checked={state.is_active}
                      onCheckedChange={() => handleToggle(phase.key)}
                    />
                  </div>
                </div>
              </CardHeader>

              {state.is_active && (
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

                  {/* Dynamic Field Renderer */}
                  {selectedAktivitaet && (
                    <DynamicFieldRenderer
                      formSchema={selectedAktivitaet.form_schema}
                      metaData={state.meta_data}
                      onMetaDataChange={(fieldName, value) =>
                        handleMetaDataChange(phase.key, fieldName, value)
                      }
                      multiSelectOptions={phase.key === 'Abschluss' ? multiSelectLernziele : []}
                    />
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