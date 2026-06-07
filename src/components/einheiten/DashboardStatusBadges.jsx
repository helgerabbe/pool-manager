/**
 * DashboardStatusBadges.jsx
 *
 * Status-Badges (M | Pr | E | Pa) für die vier Lerntypen in der Einheiten-
 * Kachel. Ersetzt die früheren prozentualen Fortschrittsbalken durch den
 * konkreten Bearbeitungszustand des jeweiligen Dashboards:
 *   - 'vorlage'    → noch unbearbeitet (Standard-Vorlage)
 *   - 'bearbeitet' → in Bearbeitung / angepasst
 *   - 'fertig'     → als fertig deklariert (Pfad freigegeben)
 *
 * Klick führt zu Tab 7 (Dashboards) der Einheit, mit Deep-Link auf den
 * jeweiligen Lerntyp. Tooltip zeigt den Klartext-Status.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LERN_TYPEN = [
  { key: 'minimalist', short: 'M', label: 'Minimalist' },
  { key: 'pragmatiker', short: 'Pr', label: 'Pragmatiker' },
  { key: 'ehrgeizig', short: 'E', label: 'Ehrgeizig' },
  { key: 'passioniert', short: 'Pa', label: 'Passioniert' },
];

const STATUS_META = {
  vorlage: {
    label: 'Vorlage',
    tooltip: 'Standard-Vorlage – noch nicht bearbeitet',
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  bearbeitet: {
    label: 'In Bearbeitung',
    tooltip: 'Wird bearbeitet / angepasst',
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  fertig: {
    label: 'Fertig',
    tooltip: 'Als fertig deklariert (freigegeben)',
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export default function DashboardStatusBadges({ einheitId, dashboardStatus }) {
  const safeStatus = dashboardStatus || {};

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-md border border-slate-200 p-2 grid grid-cols-4 gap-1.5" style={{ backgroundColor: 'hsl(220 14% 90%)' }}>
        {LERN_TYPEN.map((lt) => {
          const status = safeStatus[lt.key] || 'vorlage';
          const meta = STATUS_META[status] || STATUS_META.vorlage;
          return (
            <Tooltip key={lt.key}>
              <TooltipTrigger asChild>
                <Link
                  to={`/workspace?einheit=${einheitId}&tab=dashboards&lerntyp=${lt.key}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`cursor-pointer flex flex-col items-center gap-1 px-1 py-1.5 rounded border transition-colors hover:brightness-95 ${meta.cls}`}
                  aria-label={`${lt.label}: ${meta.label}`}
                >
                  <span className="text-[10px] font-bold leading-none">{lt.short}</span>
                  <span className="flex items-center gap-1 leading-none">
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    <span className="text-[9px] font-medium leading-none truncate">{meta.label}</span>
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {lt.label}: {meta.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}