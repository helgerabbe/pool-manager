/**
 * TabDriftIndicator.jsx
 *
 * Kleiner Punkt + Zähler am Tab-Trigger, damit der Operator auf einen
 * Blick sieht, in welchen Tabs Drift-Items liegen.
 *
 * Drei Zustände:
 *   - count = 0             → nichts
 *   - count > 0, hasNew     → blauer Punkt (neue Items)
 *   - count > 0, hasStale   → amber Punkt (out of sync)
 *   - hasNew + hasStale     → amber Punkt (Drift gewinnt vor Neu)
 */
import React from 'react';
import { cn } from '@/lib/utils';

export default function TabDriftIndicator({ newCount = 0, staleCount = 0 }) {
  const total = newCount + staleCount;
  if (total === 0) return null;
  const isStale = staleCount > 0;
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
          ? `${staleCount} Out-of-Sync${newCount > 0 ? ` · ${newCount} neu` : ''}`
          : `${newCount} neu`
      }
    >
      {total}
    </span>
  );
}