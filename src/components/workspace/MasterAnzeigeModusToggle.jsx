/**
 * MasterAnzeigeModusToggle.jsx
 *
 * Haupteinstellung (Aktivitäts-Ebene): Wie werden mehrere Master-Aufgaben
 * dieser Aktivität dem Schüler präsentiert?
 *   - 'shuffle' (Default): zufällig eine Variante pro Versuch
 *   - 'alle': alle Varianten sichtbar / alle bearbeiten
 *
 * Dezent, aber gut sichtbar – ein kompakter Zwei-Wege-Segment-Schalter
 * direkt über den Master-Karten. Nur einblenden, wenn ≥2 Master-Aufgaben
 * existieren (bei 1 Aufgabe ist der Modus irrelevant).
 */

import React from 'react';
import { Shuffle, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    value: 'shuffle',
    label: 'Shuffle',
    icon: Shuffle,
    hint: 'Zufällig eine Variante pro Versuch',
  },
  {
    value: 'alle',
    label: 'Alle bearbeiten',
    icon: ListChecks,
    hint: 'Alle Varianten sichtbar',
  },
];

export default function MasterAnzeigeModusToggle({
  value = 'shuffle',
  onChange,
  disabled = false,
  saving = false,
}) {
  const current = value === 'alle' ? 'alle' : 'shuffle';
  const activeHint = OPTIONS.find((o) => o.value === current)?.hint;

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">Wiedergabe für Schüler</p>
        <p className="text-[11px] text-muted-foreground truncate">{activeHint}</p>
      </div>
      <div className="inline-flex rounded-md border border-border bg-card p-0.5 shrink-0">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled || saving}
              onClick={() => !isActive && onChange?.(opt.value)}
              title={opt.hint}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                (disabled || saving) && 'opacity-60 cursor-not-allowed'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}