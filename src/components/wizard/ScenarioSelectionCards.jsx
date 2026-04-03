import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ScenarioSelectionCards({ szenarien, onSelect, selectedScenario, onRegenerate, loading }) {
  if (!szenarien) return null;

  const scenarios = [
    { key: 'szenario_a', label: 'Szenario A', data: szenarien.szenario_a },
    { key: 'szenario_b', label: 'Szenario B', data: szenarien.szenario_b },
  ];

  return (
    <div className="space-y-4 overflow-y-auto pr-4 flex flex-col">
      <div className="text-center mb-6">
        <h3 className="font-semibold text-foreground mb-2">Wählen Sie einen didaktischen Ansatz</h3>
        <p className="text-xs text-muted-foreground">
          Die KI hat zwei unterschiedliche Strukturvorschläge entwickelt. Welcher spricht Sie mehr an?
        </p>
      </div>

      <div className="grid gap-4 flex-1">
        {scenarios.map(({ key, label, data }) => (
          <div
            key={key}
            className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
              selectedScenario === key
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 bg-card'
            }`}
            onClick={() => onSelect(key)}
          >
            {/* Header mit Checkbox */}
            <div className="flex items-start gap-3 mb-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all ${
                  selectedScenario === key
                    ? 'border-primary bg-primary'
                    : 'border-border'
                }`}
              >
                {selectedScenario === key && (
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{label}: {data.titel}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{data.erlaeuterung.split('\n')[0]}</p>
              </div>
            </div>

            {/* Pädagogische Erläuterung (komplett) */}
            <div className="ml-8 mb-3">
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {data.erlaeuterung}
              </p>
            </div>

            {/* Themenfelder-Übersicht */}
            <div className="ml-8 space-y-2">
              <p className="text-xs font-medium text-foreground">Themenfelder:</p>
              {data.themenfelder && data.themenfelder.map((tf, idx) => (
                <div
                  key={idx}
                  className="text-xs bg-muted/50 rounded px-2 py-1 text-muted-foreground"
                >
                  • {tf.titel}
                </div>
              ))}
            </div>

            {/* Action Button */}
            <div className="mt-4 ml-8">
              <Button
                size="sm"
                variant={selectedScenario === key ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(key);
                }}
                className="w-full"
                disabled={loading}
              >
                {selectedScenario === key ? 'Ausgewählt' : 'Mit diesem Szenario weiterarbeiten'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Regenerate Button */}
      <div className="mt-auto pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Neue Vorschläge werden generiert...' : 'Keines der Szenarien passt – bitte zwei neue Vorschläge generieren'}
        </Button>
      </div>
    </div>
  );
}