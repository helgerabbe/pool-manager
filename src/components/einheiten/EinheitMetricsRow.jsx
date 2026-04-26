/**
 * EinheitMetricsRow.jsx
 *
 * Schmale Reihe mit 4 Volumen-Indikatoren in der Einheiten-Kachel.
 * Jeder Indikator ist eine eigene Klick-Zone und routet in einen
 * spezifischen Workspace-Tab.
 *
 * Routing-Mapping (geklärt mit Product):
 *   - Themenfelder → tab=struktur
 *   - Lernpakete   → tab=aktivitaeten
 *   - Level 2      → tab=ebene2
 *   - Level 3      → tab=ebene3
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Package, ClipboardList, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const INDICATORS = [
  {
    key: 'themenfelder',
    icon: LayoutGrid,
    label: 'Themenfelder',
    tab: 'struktur',
    tooltip: (n) => `${n} Themenfeld${n === 1 ? '' : 'er'} – zum Strukturboard`,
  },
  {
    key: 'lernpakete',
    icon: Package,
    label: 'Pakete',
    tab: 'aktivitaeten',
    tooltip: (n) => `${n} Lernpaket${n === 1 ? '' : 'e'} – zu Aktivitäten & Lernzielen`,
  },
  {
    key: 'level2',
    icon: ClipboardList,
    label: 'L2',
    tab: 'ebene2',
    tooltip: (n) => `${n} Aufgabe${n === 1 ? '' : 'n'} der Ebene 2 – zum Aufgabenpool`,
  },
  {
    key: 'level3',
    icon: Target,
    label: 'L3',
    tab: 'ebene3',
    tooltip: (n) => `${n} Projekt${n === 1 ? '' : 'e'} der Ebene 3 – zu Projektaufgaben`,
  },
];

export default function EinheitMetricsRow({ einheitId, volume }) {
  const safe = volume || { themenfelder: 0, lernpakete: 0, level2: 0, level3: 0 };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-4 gap-1">
        {INDICATORS.map((ind) => {
          const Icon = ind.icon;
          const value = safe[ind.key] || 0;
          return (
            <Tooltip key={ind.key}>
              <TooltipTrigger asChild>
                <Link
                  to={`/workspace?einheit=${einheitId}&tab=${ind.tab}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-primary hover:bg-muted/60 transition-colors"
                  aria-label={ind.tooltip(value)}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="tabular-nums font-semibold">{value}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {ind.tooltip(value)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}