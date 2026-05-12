/**
 * components/workspace/lernpaketWizard/WizardGlossarSidebar.jsx
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §6).
 *
 * Kontextbezogene Sidebar, die zeigt, welche Aktivitätstypen die KI
 * pro Phase einsetzen kann. Klick auf einen Eintrag fügt den Namen in
 * das Briefing-Feld ein (über onInsert-Callback). Reine Hilfe — keine
 * Geschäftslogik.
 */
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getGlossarFuerPhase } from '@/lib/wizardGlossar';
import { BookOpen } from 'lucide-react';

const PHASE_META = {
  Input: { icon: '📚', color: 'border-green-200 bg-green-50/50' },
  'Übung': { icon: '✏️', color: 'border-pink-200 bg-pink-50/50' },
  Abschluss: { icon: '🎯', color: 'border-blue-200 bg-blue-50/50' },
};

export default function WizardGlossarSidebar({ katalog = [], onInsert }) {
  const phasen = useMemo(() => (
    ['Input', 'Übung', 'Abschluss'].map((phase) => ({
      phase,
      items: getGlossarFuerPhase(phase, katalog),
    }))
  ), [katalog]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BookOpen className="w-4 h-4 text-primary" />
        Verfügbare Aktivitäten
      </div>
      <p className="text-xs text-muted-foreground leading-snug">
        Klicke einen Typ an, um ihn ins Briefing zu übernehmen.
      </p>
      {phasen.map(({ phase, items }) => {
        if (items.length === 0) return null;
        const meta = PHASE_META[phase];
        return (
          <div key={phase} className={`space-y-1.5 p-2.5 rounded-lg border ${meta.color}`}>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{meta.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {phase}
              </span>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {items.length}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              {items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onInsert?.(item.name)}
                  title={item.beschreibung}
                  className="text-[11px] px-2 py-0.5 rounded border border-border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}