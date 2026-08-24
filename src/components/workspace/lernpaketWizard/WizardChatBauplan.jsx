/**
 * WizardChatBauplan.jsx
 * Kompakte Anzeige des im Chat entstehenden Bauplans: geplante Aktivitäten
 * gruppiert nach Phase, mit Entfernen-Möglichkeit pro Eintrag.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const PHASE_ORDER = ['Input', 'Übung', 'Abschluss'];
const PHASE_LABEL = { Input: '📚 Erarbeitung', 'Übung': '✏️ Übung', Abschluss: '🎯 Abschluss' };

export default function WizardChatBauplan({ bauplan, onRemove, disabled }) {
  const items = bauplan?.items || [];
  if (items.length === 0) return null;

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-foreground">
          Bauplan ({items.length} Aktivität{items.length !== 1 ? 'en' : ''})
        </h4>
      </div>
      {bauplan.leitidee && (
        <p className="text-[11px] text-muted-foreground italic leading-snug">💡 {bauplan.leitidee}</p>
      )}
      {PHASE_ORDER.map((phase) => {
        const phaseItems = items.map((it, i) => ({ ...it, _index: i })).filter((it) => it.phase === phase);
        if (phaseItems.length === 0) return null;
        return (
          <div key={phase} className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {PHASE_LABEL[phase]}
            </p>
            {phaseItems.map((it) => (
              <div
                key={it._index}
                className="flex items-start gap-2 rounded bg-background border border-border px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{it.aktivitaetstyp}</span>
                    {it.ideenkiste_id && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200">
                        Ideenkiste
                      </Badge>
                    )}
                    {it.material_indizes?.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        📎 {it.material_indizes.length}
                      </Badge>
                    )}
                  </div>
                  {it.idee && (
                    <p className="text-[11px] text-muted-foreground leading-snug">{it.idee}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(it._index)}
                  disabled={disabled}
                  className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5 disabled:opacity-50"
                  title="Aus dem Bauplan entfernen"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}