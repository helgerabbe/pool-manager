import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function ScenarioSelectionGrid({ szenarien, onSelect, selectedScenario, onRegenerate, loading }) {
  if (!szenarien) return null;

  const scenarios = [
    { key: 'szenario_a', label: 'Szenario A', data: szenarien.szenario_a },
    { key: 'szenario_b', label: 'Szenario B', data: szenarien.szenario_b },
  ];

  return (
    <div className="space-y-4 overflow-y-auto pr-4 flex flex-col h-full">
      <div className="text-center mb-4">
        <h3 className="font-semibold text-foreground mb-1">Wählen Sie einen didaktischen Ansatz</h3>
        <p className="text-xs text-muted-foreground">
          Welcher Ansatz passt zu Ihrer Klasse?
        </p>
      </div>

      {/* Szenario-Kacheln nebeneinander */}
      <div className="grid grid-cols-2 gap-3 flex-1">
        {scenarios.map(({ key, label, data }) => (
          <div
            key={key}
            className={`border-2 rounded-lg p-3 transition-all cursor-pointer flex flex-col ${
              selectedScenario === key
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 bg-card'
            }`}
            onClick={() => onSelect(key)}
          >
            {/* Auswahl-Indikator */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  selectedScenario === key
                    ? 'border-primary bg-primary'
                    : 'border-border'
                }`}
              >
                {selectedScenario === key && (
                  <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                )}
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            </div>

            {/* Titel */}
            <h4 className="font-semibold text-sm text-foreground mb-1 leading-tight">{data.titel}</h4>

            {/* Kurzbeschreibung (erste Zeile) */}
            <p className="text-xs text-muted-foreground mb-2 flex-1 line-clamp-3">
              {data.erlaeuterung.split('\n')[0]}
            </p>

            {/* Themenfelder-Count */}
            <div className="text-xs text-muted-foreground mb-3 bg-muted/50 rounded px-2 py-1">
              {data.themenfelder?.length || 0} Themenfelder
            </div>

            {/* Action Button */}
            <Button
              size="sm"
              variant={selectedScenario === key ? 'default' : 'outline'}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(key);
              }}
              disabled={loading}
              className="w-full text-xs"
            >
              {selectedScenario === key ? 'Gewählt' : 'Wählen'}
            </Button>
          </div>
        ))}
      </div>

      {/* Regenerate Button */}
      <div className="mt-auto pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? 'Neue Vorschläge...' : 'Keines passt – neue Vorschläge generieren'}
        </Button>
      </div>
    </div>
  );
}