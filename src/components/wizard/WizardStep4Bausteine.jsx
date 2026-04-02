import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, BookOpen, Check, SkipForward } from 'lucide-react';
import { toast } from 'sonner';

const PHASEN = [
  { key: 'Input', label: 'Input', color: 'bg-blue-50 border-blue-200' },
  { key: 'Übung', label: 'Übung', color: 'bg-green-50 border-green-200' },
  { key: 'Abschluss', label: 'Abschluss', color: 'bg-purple-50 border-purple-200' },
];

export default function WizardStep4Bausteine({ einheitId, onDone, onSkipAll }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [phasenConfig, setPhasenConfig] = useState({}); // paketId -> { Input, Übung, Abschluss: boolean }

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Initialisiere Config wenn sich die Lernpakete ändern
  useEffect(() => {
    const config = {};
    paketeFuerEinheit.forEach(paket => {
      if (!phasenConfig[paket.id]) {
        config[paket.id] = {
          Input: true,
          Übung: true,
          Abschluss: true,
        };
      } else {
        config[paket.id] = phasenConfig[paket.id];
      }
    });
    
    // Nur aktualisieren wenn sich was geändert hat
    if (JSON.stringify(config) !== JSON.stringify(phasenConfig)) {
      setPhasenConfig(config);
    }
  }, [paketeFuerEinheit]);

  const handleToggle = (paketId, phase) => {
    setPhasenConfig(prev => ({
      ...prev,
      [paketId]: {
        ...prev[paketId],
        [phase]: !prev[paketId][phase],
      },
    }));
  };

  const handleGenerieren = async () => {
    setGenerating(true);
    let count = 0;

    for (const paket of paketeFuerEinheit) {
      const config = phasenConfig[paket.id] || {};
      const phasenKonfiguration = {
        Input: { disabled: !config.Input, selected_aktivitaet_id: '', field_values: {} },
        Übung: { disabled: !config.Übung, selected_aktivitaet_id: '', field_values: {} },
        Abschluss: { disabled: !config.Abschluss, selected_aktivitaet_id: '', field_values: {} },
      };

      await base44.entities.Lernpakete.update(paket.id, {
        phasen_konfiguration: phasenKonfiguration,
      });
      count++;
    }

    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    toast.success(`${count} Lernpakete mit Phasenkonfiguration aktualisiert.`);
    setGenerating(false);
    setDone(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schritt 4: Lernphasen konfigurieren</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Jedes Lernpaket wird standardmäßig mit drei Phasen angelegt: Input, Übung und Abschluss.
          Sie können einzelne Phasen abwählen, falls sie nicht benötigt werden.
        </p>
      </div>

      {paketeFuerEinheit.length === 0 ? (
        <p className="text-muted-foreground text-sm italic text-center py-8">
          Es wurden noch keine Lernpakete angelegt. Sie können diesen Schritt überspringen.
        </p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {paketeFuerEinheit.map(paket => (
            <div key={paket.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/40">
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {paket.reihenfolge_nummer}
                </div>
                <span className="text-sm font-semibold flex-1">{paket.titel_des_pakets}</span>
                <span className="text-xs text-muted-foreground">
                  {paket.geschaetzte_dauer_minuten ? `${paket.geschaetzte_dauer_minuten} Min.` : '—'}
                </span>
              </div>

              <div className="p-3 flex gap-2">
                {PHASEN.map(phase => (
                  <div
                    key={phase.key}
                    className={`flex flex-1 items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${
                      phasenConfig[paket.id]?.[phase.key]
                        ? `${phase.color} border-opacity-100`
                        : 'bg-muted/30 border-muted opacity-50'
                    }`}
                  >
                    <Switch
                      checked={phasenConfig[paket.id]?.[phase.key] || false}
                      onCheckedChange={() => handleToggle(paket.id, phase.key)}
                    />
                    <span className="text-sm font-medium truncate">{phase.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {paketeFuerEinheit.length > 0 && !done && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary">
          <strong>{paketeFuerEinheit.length} Lernpakete</strong> werden mit ihren Phasenkonfigurationen aktualisiert.
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onSkipAll || onDone} className="gap-2 text-muted-foreground border-dashed">
          <SkipForward className="w-4 h-4" />
          Überspringen & Leer starten
        </Button>
        {!done ? (
          <Button onClick={handleGenerieren} disabled={generating || paketeFuerEinheit.length === 0} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            Phasenkonfiguration speichern
          </Button>
        ) : (
          <Button onClick={onDone} className="gap-2 bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4" />
            Zum Workspace
          </Button>
        )}
      </div>
    </div>
  );
}