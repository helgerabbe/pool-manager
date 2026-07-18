/**
 * DashboardZustandBadge.jsx
 *
 * Kompaktes Badge für den Bearbeitungs-Zustand eines Lerntyp-Dashboards
 * in den Lerntyp-Pills (Tab „Dashboards"). Ersetzt den früheren farbigen
 * Punkt, der ohne Erklärung nicht verständlich war.
 *
 * Vier Zustände:
 *   automatisch → automatisch erstellt, noch nicht angepasst/bestätigt
 *   bearbeitet  → von der Fachschaft angepasst oder übernommen
 *   freigegeben → als geprüft/vollständig markiert
 *   gesperrt    → Einheit final freigegeben / im Export
 */

import React from 'react';
import { Wand2, PenLine, CheckCircle2, Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const ZUSTAND_META = {
  automatisch: {
    label: 'Automatisch',
    icon: Wand2,
    cls: 'bg-violet-50 text-violet-700 border-violet-200',
    tooltip: 'Automatisch aus der Einheiten-Struktur erstellt – noch nicht angepasst oder bestätigt.',
  },
  bearbeitet: {
    label: 'Bearbeitet',
    icon: PenLine,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    tooltip: 'Von der Fachschaft angepasst bzw. übernommen – noch nicht als geprüft freigegeben.',
  },
  freigegeben: {
    label: 'Freigegeben',
    icon: CheckCircle2,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tooltip: 'Als geprüft/vollständig markiert. Die Aufgaben bleiben bearbeitbar, bis die Einheit final freigegeben wird.',
  },
  gesperrt: {
    label: 'Gesperrt',
    icon: Lock,
    cls: 'bg-blue-50 text-blue-800 border-blue-200',
    tooltip: 'Die Einheit ist final freigegeben bzw. im Export – keine Änderungen möglich.',
  },
};

export default function DashboardZustandBadge({ zustand }) {
  const meta = ZUSTAND_META[zustand] || ZUSTAND_META.automatisch;
  const Icon = meta.icon;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold leading-none ${meta.cls}`}
          >
            <Icon className="w-2.5 h-2.5 shrink-0" />
            {meta.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          <p className="font-semibold mb-0.5">Dashboard-Zustand: {meta.label}</p>
          <p>{meta.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}