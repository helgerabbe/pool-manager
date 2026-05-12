/**
 * components/workspace/lernpaketWizard/WizardProposalPreview.jsx
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.5).
 *
 * Zeigt den von der KI generierten Vorschlag gruppiert nach den drei
 * Phasen. Items lassen sich einzeln löschen, Phase-Autokorrekturen
 * werden transparent als kleines Badge ausgewiesen ("Phase angepasst").
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw } from 'lucide-react';

const PHASE_META = {
  Input: { icon: '📚', color: 'bg-green-50 border-green-200' },
  'Übung': { icon: '✏️', color: 'bg-pink-50 border-pink-200' },
  Abschluss: { icon: '🎯', color: 'bg-blue-50 border-blue-200' },
};

export default function WizardProposalPreview({ proposal, onRemoveItem }) {
  if (!proposal) return null;
  const phasen = proposal.phasen || {};
  const totalItems = Object.values(phasen).reduce((s, arr) => s + (arr?.length || 0), 0);

  if (totalItems === 0) {
    return (
      <div className="p-6 rounded-lg border border-dashed bg-muted/30 text-center">
        <p className="text-sm text-muted-foreground">
          Alle Vorschläge wurden entfernt. Generiere neu, um einen anderen Vorschlag zu erhalten.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {['Input', 'Übung', 'Abschluss'].map((phase) => {
        const items = phasen[phase] || [];
        if (items.length === 0) return null;
        const meta = PHASE_META[phase];

        return (
          <div key={phase} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{meta.icon}</span>
              <h4 className="text-sm font-semibold text-foreground">{phase}</h4>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
            <div className="space-y-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 p-3 rounded border text-sm ${meta.color}`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{item.aktivitaetstyp}</span>
                      {item.phase_originalwert && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 bg-amber-50 border-amber-200 text-amber-800"
                          title={`KI wollte ursprünglich Phase "${item.phase_originalwert}". Automatisch korrigiert.`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Phase angepasst
                        </Badge>
                      )}
                    </div>
                    {item.begruendung && (
                      <p className="text-xs text-muted-foreground italic leading-snug">
                        {item.begruendung}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemoveItem(phase, item.id)}
                    title="Diese Aktivität entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}