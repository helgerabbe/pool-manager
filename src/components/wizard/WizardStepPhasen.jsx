import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';

const PHASEN = ['Input', 'Übung', 'Abschluss'];

export default function WizardStepPhasen({
  structure = { lernpakete: [] },
  phasenKonfiguration = {},
  onPhasenChange,
  onNext,
}) {
  const [config, setConfig] = useState(phasenKonfiguration);

  useEffect(() => {
    setConfig(phasenKonfiguration);
  }, [phasenKonfiguration]);

  const handleTogglePhase = (paketId, phase) => {
    const key = `${paketId}-${phase}`;
    const updated = { ...config };

    if (!updated[paketId]) {
      updated[paketId] = {};
    }

    updated[paketId][phase] = !updated[paketId][phase];
    setConfig(updated);
    onPhasenChange(updated);
  };

  const getPhasesForPaket = (paketId) => {
    return config[paketId] || {};
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Phasen konfigurieren</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Definieren Sie, welche Lernphasen für jedes Lernpaket verfügbar sein sollen.
        </p>
      </div>

      {/* Phasen-Übersicht */}
      <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
        {structure.lernpakete.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Keine Lernpakete vorhanden.
          </p>
        ) : (
          structure.lernpakete.map(paket => {
            const paketPhasen = getPhasesForPaket(paket.id);
            const aktivePhasen = PHASEN.filter(phase => paketPhasen[phase]);

            return (
              <div key={paket.id} className="bg-card border rounded-lg p-4 space-y-3">
                {/* Paket Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{paket.titel_des_pakets}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {aktivePhasen.length > 0 ? aktivePhasen.join(', ') : 'Keine Phasen ausgewählt'}
                    </p>
                  </div>
                </div>

                {/* Phase Checkboxes */}
                <div className="space-y-2">
                  {PHASEN.map(phase => (
                    <label
                      key={phase}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={paketPhasen[phase] || false}
                        onCheckedChange={() => handleTogglePhase(paket.id, phase)}
                      />
                      <span className="text-sm text-foreground font-medium">{phase}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium">Hinweis:</p>
        <p className="mt-1">
          Jedes Lernpaket muss mindestens eine Phase haben. Die Phasen bestimmen, welche Aktivitäten in der Werkbank verfügbar sind.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline">Zurück</Button>
        <Button 
          onClick={onNext} 
          disabled={!structure.lernpakete.every(p => Object.values(getPhasesForPaket(p.id)).some(v => v))}
          className="gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          Abschluss & Export
        </Button>
      </div>
    </div>
  );
}