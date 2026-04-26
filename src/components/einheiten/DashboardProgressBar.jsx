/**
 * DashboardProgressBar.jsx
 *
 * Horizontale 4-Segment-Leiste (M | Pr | E | Pa) mit Mini-Progress-Bars
 * für die vier Lerntypen. Klick führt zu Tab 7 (Dashboards) der Einheit;
 * der angeklickte Lerntyp wird aktuell rein als optisches Highlight
 * markiert (Tab-7-Cockpit lädt seinen letzten aktiven Tab selbst).
 *
 * Tooltip zeigt den genauen Prozentwert pro Segment.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LERN_TYPEN = [
  { key: 'minimalist', short: 'M', label: 'Minimalist', barClass: 'bg-slate-600' },
  { key: 'pragmatiker', short: 'Pr', label: 'Pragmatiker', barClass: 'bg-blue-600' },
  { key: 'ehrgeizig', short: 'E', label: 'Ehrgeizig', barClass: 'bg-amber-600' },
  { key: 'passioniert', short: 'Pa', label: 'Passioniert', barClass: 'bg-violet-600' },
];

export default function DashboardProgressBar({ einheitId, progress }) {
  const safeProgress = progress || {};

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-4 gap-1">
        {LERN_TYPEN.map((lt) => {
          const value = Math.max(0, Math.min(100, Math.round(safeProgress[lt.key] || 0)));
          return (
            <Tooltip key={lt.key}>
              <TooltipTrigger asChild>
                <Link
                  to={`/workspace?einheit=${einheitId}&tab=dashboards&lerntyp=${lt.key}`}
                  onClick={(e) => e.stopPropagation()}
                  className="group flex flex-col gap-0.5 px-1 py-1 rounded hover:bg-muted/60 transition-colors"
                  aria-label={`${lt.label}: ${value}% konfiguriert`}
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    <span>{lt.short}</span>
                    <span className="tabular-nums">{value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${lt.barClass} transition-all`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {lt.label}: {value} % konfiguriert
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}