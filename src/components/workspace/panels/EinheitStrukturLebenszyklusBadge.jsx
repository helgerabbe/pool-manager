import React from 'react';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * EinheitStrukturLebenszyklusBadge
 * ────────────────────────────────
 * Zeigt den Moodle-Lebenszyklus der STRUKTUR einer Einheit (Tab 2) als
 * kompaktes Pill an. Basis ist das Feld `sync_status` der Einheit.
 *
 *   new      → Neu (Struktur wurde noch nie nach Moodle exportiert)
 *   pending  → Im Export
 *   synced   → Synchron
 *   modified → Struktur nach Export geändert → Neu-Export nötig
 *   to_delete→ Wird gelöscht
 *
 * Rein anzeigend. Das Setzen von 'modified' passiert beim Speichern in Tab 2
 * über die Backend-Funktion markEinheitStrukturModified.
 */
const CONFIG = {
  new: {
    label: 'Neu – noch nie exportiert',
    icon: Clock,
    cls: 'bg-slate-100 text-slate-600 border border-slate-200',
    tooltip: 'Die Struktur dieser Einheit wurde noch nie nach Moodle exportiert.',
  },
  pending: {
    label: 'Im Export',
    icon: RefreshCw,
    cls: 'bg-blue-100 text-blue-700 border border-blue-300',
    tooltip: 'Die Struktur dieser Einheit befindet sich gerade im Export nach Moodle.',
  },
  synced: {
    label: 'Synchronisiert',
    icon: CheckCircle2,
    cls: 'bg-green-100 text-green-700 border border-green-300',
    tooltip: 'Die Struktur dieser Einheit ist mit Moodle synchronisiert.',
  },
  modified: {
    label: 'Struktur geändert – Neu-Export nötig',
    icon: AlertCircle,
    cls: 'bg-amber-100 text-amber-700 border border-amber-300',
    tooltip: 'Die Struktur wurde nach dem letzten Export geändert. Ein erneuter Export ist nötig, damit Moodle wieder aktuell ist.',
  },
  to_delete: {
    label: 'Wird gelöscht',
    icon: Trash2,
    cls: 'bg-red-100 text-red-700 border border-red-300',
    tooltip: 'Diese Einheit ist zum Löschen vorgemerkt.',
  },
};

export default function EinheitStrukturLebenszyklusBadge({ syncStatus }) {
  const cfg = CONFIG[syncStatus] || CONFIG.new;
  const Icon = cfg.icon;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.cls}`}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">{cfg.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}