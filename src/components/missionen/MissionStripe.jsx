/**
 * MissionStripe — 4px farbiger Streifen am linken Rand einer Listen-Karte.
 *
 * Wird vor der Karten-Inhaltsspalte gerendert (z. B. in `flex`-Containern).
 * Bei fehlender Mission rendert die Komponente einen neutralen, leicht
 * gepunkteten Streifen, damit die Karte trotzdem optisch ausgerichtet bleibt.
 *
 * Props:
 *   - missionId: string|null
 *   - className: string  (z. B. 'self-stretch' für volle Höhe in Flex-Containern)
 */
import React from 'react';
import { getMission } from '@/lib/missionen';
import { cn } from '@/lib/utils';

export default function MissionStripe({ missionId, className = '' }) {
  const mission = getMission(missionId);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'w-1 shrink-0 rounded-full',
        mission ? mission.classes.stripe : 'bg-slate-200',
        className
      )}
      title={mission ? `${mission.emoji} ${mission.label}` : 'Mission fehlt'}
    />
  );
}