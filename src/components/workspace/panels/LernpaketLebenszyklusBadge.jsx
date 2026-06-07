import React from 'react';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * LernpaketLebenszyklusBadge
 * ──────────────────────────
 * Zeigt den Moodle-Lebenszyklus eines Lernpakets als kompaktes Pill an –
 * getrennt vom Bearbeitungszustand (StatusBadge). Basis ist das Feld
 * `sync_status` des Lernpakets.
 *
 *   new      → Neu (noch nie nach Moodle exportiert)
 *   pending  → Im Export
 *   synced   → Synchron
 *   modified → Nicht mehr synchron (nach Export geändert)
 *   to_delete→ Wird gelöscht
 */
const CONFIG = {
  new: {
    label: 'Neu',
    icon: Clock,
    cls: 'bg-slate-100 text-slate-600 border border-slate-200',
    tooltip: 'Dieses Lernpaket wurde noch nie nach Moodle exportiert.',
  },
  pending: {
    label: 'Im Export',
    icon: RefreshCw,
    cls: 'bg-blue-100 text-blue-700 border border-blue-300',
    tooltip: 'Dieses Lernpaket befindet sich gerade im Export nach Moodle.',
  },
  synced: {
    label: 'Synchron',
    icon: CheckCircle2,
    cls: 'bg-green-100 text-green-700 border border-green-300',
    tooltip: 'Dieses Lernpaket ist mit Moodle synchronisiert.',
  },
  modified: {
    label: 'Nicht synchron',
    icon: AlertCircle,
    cls: 'bg-amber-100 text-amber-700 border border-amber-300',
    tooltip: 'Dieses Lernpaket wurde nach dem letzten Export geändert – ein erneuter Export ist nötig.',
  },
  to_delete: {
    label: 'Wird gelöscht',
    icon: Trash2,
    cls: 'bg-red-100 text-red-700 border border-red-300',
    tooltip: 'Dieses Lernpaket ist zum Löschen vorgemerkt.',
  },
};

export default function LernpaketLebenszyklusBadge({ syncStatus }) {
  const cfg = CONFIG[syncStatus] || CONFIG.new;
  const Icon = cfg.icon;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">{cfg.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}