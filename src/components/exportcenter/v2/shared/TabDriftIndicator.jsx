/**
 * TabDriftIndicator.jsx
 *
 * Kleiner Punkt + Zähler am Tab-Trigger, damit der Operator auf einen
 * Blick sieht, in welchen Tabs Items zur Generierung anstehen.
 *
 * Drei Zustände:
 *   - count = 0             → nichts
 *   - count > 0, hasNew     → blauer Punkt (neue Items)
 *   - count > 0, hasStale   → amber Punkt (Payload veraltet, neu generieren)
 *   - hasNew + hasStale     → amber Punkt (Drift gewinnt vor Neu)
 *
 * Initial-Export-Sonderfall: Wenn `treatStaleAsNew === true`, werden
 * Drift-Items als „neu" behandelt (vor dem ersten Moodle-Export ist
 * „veraltet" semantisch sinnlos).
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function TabDriftIndicator({ newCount = 0, staleCount = 0, treatStaleAsNew = false }) {
  const total = newCount + staleCount;
  if (total === 0) return null;

  // Initial-Export: Stale-Items werden zu New-Items.
  const effectiveNew = treatStaleAsNew ? newCount + staleCount : newCount;
  const effectiveStale = treatStaleAsNew ? 0 : staleCount;
  const isStale = effectiveStale > 0;

  return (
    <span
      className={cn(
        'ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold tabular-nums border',
        isStale
          ? 'bg-amber-100 text-amber-900 border-amber-300'
          : 'bg-blue-100 text-blue-800 border-blue-300'
      )}
      title={
        isStale
          ? `${effectiveStale} neu generieren${effectiveNew > 0 ? ` · ${effectiveNew} neu` : ''}`
          : `${effectiveNew} neu`
      }
    >
      {total}
    </span>
  );
}