/**
 * MissionPicker — Kachel-Auswahl der Aufgabenkategorie im Edit-Dialog.
 *
 * Zeigt alle Kategorien aus lib/missionen als anklickbare Kacheln. Das Feld
 * darf bewusst leer bleiben.
 *
 * Props:
 *   - value:    string|null      aktuell ausgewählte Kategorie (oder null)
 *   - onChange: (id|null) => void
 *   - disabled: boolean
 *   - kompakt:  boolean           alle Kacheln in EINER Reihe, ohne Überschrift
 *                                 und ohne Beschreibungstext. Für Stellen, an
 *                                 denen die Auswahl in einem Akkordeon sitzt
 *                                 und die Erklärung schon darüber steht.
 */
import React from 'react';
import { MISSIONEN } from '@/lib/missionen';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MissionPicker({ value, onChange, disabled = false, kompakt = false }) {
  return (
    <div className="space-y-2">
      <div className={cn('flex items-center justify-between', kompakt && 'hidden')}>
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Kategorie der Aufgabe
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Auswahl löschen
          </button>
        )}
      </div>

      {!kompakt && (
        <p className="text-[11px] text-muted-foreground">
          Wo im Unterrichtsverlauf steht diese Aufgabe?
        </p>
      )}

      <div className={kompakt
        ? 'grid grid-cols-2 sm:grid-cols-4 gap-2'
        : 'grid grid-cols-2 sm:grid-cols-3 gap-2'}>
        {MISSIONEN.map((m) => {
          const isActive = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => !disabled && onChange(m.id)}
              disabled={disabled}
              aria-pressed={isActive}
              title={kompakt ? m.kern : undefined}
              className={cn(
                'relative flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 text-left transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isActive ? m.classes.tileActive : m.classes.tile
              )}
            >
              {isActive && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white border flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-foreground" />
                </span>
              )}
              <div className="flex items-center gap-1.5 text-base leading-none">
                <span aria-hidden="true">{m.emoji}</span>
              </div>
              <div className="text-xs font-semibold leading-snug">{m.label}</div>
              {!kompakt && (
                <div className="text-[10px] text-muted-foreground leading-snug">{m.kern}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}