import React from 'react';
import { MISSIONEN } from '@/lib/missionen';
import { cn } from '@/lib/utils';

export default function MissionTypeChoiceList({ selectedMissionType, onSelect, disabled = false }) {
  return (
    <div className="space-y-2">
      {MISSIONEN.map((mission) => {
        const active = selectedMissionType === mission.id;
        return (
          <button
            key={mission.id}
            type="button"
            onClick={() => onSelect(mission.id)}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border bg-white p-3 text-left transition-all disabled:opacity-60',
              active ? mission.classes.tileActive : mission.classes.tile
            )}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">{mission.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-foreground">{mission.label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{mission.kern}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}