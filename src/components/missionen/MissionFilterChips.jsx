/**
 * MissionFilterChips — Filterleiste am Tab-Header der Allgemeinen Aufgaben.
 *
 * Bietet "Alle" + 6 Missions-Chips + optional einen "Mission fehlt"-Chip.
 * Der ausgewählte Wert wird vom Parent verwaltet (lokaler Filter-State).
 *
 * Props:
 *   - value:    string|null   aktuell aktiver Filter
 *                              ('all' | <mission-id> | 'none')
 *   - onChange: (val) => void
 *   - showNoneFilter: boolean Wenn true: extra Chip "Ohne Mission".
 *   - counts:   { [missionId]: number, none?: number, all?: number }
 *               optional: zeigt kleine Zahlen-Badges in den Chips an.
 */
import React from 'react';
import { MISSIONEN } from '@/lib/missionen';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FILTER_ALL = 'all';
const FILTER_NONE = 'none';

export default function MissionFilterChips({
  value = FILTER_ALL,
  onChange,
  showNoneFilter = true,
  counts = null,
}) {
  const isActive = (v) => value === v;

  const renderCount = (key) => {
    if (!counts || counts[key] === undefined) return null;
    return (
      <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white/30 text-[10px] font-bold">
        {counts[key]}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* "Alle" */}
      <button
        type="button"
        onClick={() => onChange(FILTER_ALL)}
        className={cn(
          'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
          isActive(FILTER_ALL)
            ? 'bg-slate-800 text-white border-slate-800'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        )}
      >
        Alle
        {renderCount('all')}
      </button>

      {/* 6 Missionen */}
      {MISSIONEN.map((m) => {
        const active = isActive(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            title={m.kern}
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
              active ? m.classes.chip : m.classes.chipIdle
            )}
          >
            <span aria-hidden="true">{m.emoji}</span>
            <span>{m.label}</span>
            {renderCount(m.id)}
          </button>
        );
      })}

      {/* "Mission fehlt" */}
      {showNoneFilter && (
        <button
          type="button"
          onClick={() => onChange(FILTER_NONE)}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
            isActive(FILTER_NONE)
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
          )}
          title="Aufgaben ohne zugeordnete Mission"
        >
          <AlertCircle className="w-3 h-3" />
          Ohne Mission
          {renderCount(FILTER_NONE)}
        </button>
      )}
    </div>
  );
}

export { FILTER_ALL, FILTER_NONE };