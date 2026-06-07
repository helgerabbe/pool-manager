import React from 'react';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Trash2, Pencil, Upload, Lock, Unlock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * CockpitSyncBadge
 * ────────────────
 * Einheitliches Lebenszyklus-Pill für ALLE Elemente im Freigabe-Cockpit.
 * Stellt den Moodle-Sync-Status (`sync_status`) konsistent dar:
 *
 *   new      → Neu (noch nie exportiert)
 *   pending  → Im Export
 *   synced   → Synchron / In Moodle
 *   modified → Geändert seit Export → Neu-Export nötig
 *   error    → Export-Fehler
 *   to_delete→ Wird gelöscht
 *
 * Rein anzeigend.
 */
const CONFIG = {
  new:       { label: 'Neu',          icon: Clock,       cls: 'bg-slate-100 text-slate-600 border-slate-200',  tip: 'Noch nie nach Moodle exportiert.' },
  pending:   { label: 'Im Export',    icon: RefreshCw,   cls: 'bg-blue-100 text-blue-700 border-blue-300',     tip: 'Befindet sich gerade im Export nach Moodle.' },
  synced:    { label: 'Synchron',     icon: CheckCircle2,cls: 'bg-green-100 text-green-700 border-green-300',   tip: 'Mit Moodle synchronisiert – aktuell live.' },
  modified:  { label: 'Geändert',     icon: AlertCircle, cls: 'bg-amber-100 text-amber-700 border-amber-300',   tip: 'Nach dem letzten Export geändert – ein erneuter Export ist nötig.' },
  error:     { label: 'Export-Fehler',icon: AlertCircle, cls: 'bg-red-100 text-red-700 border-red-300',         tip: 'Letzter Export ist fehlgeschlagen.' },
  to_delete: { label: 'Wird gelöscht',icon: Trash2,      cls: 'bg-red-100 text-red-700 border-red-300',         tip: 'Zum Löschen vorgemerkt.' },
};

export default function CockpitSyncBadge({ syncStatus }) {
  const cfg = CONFIG[syncStatus] || CONFIG.new;
  const Icon = cfg.icon;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${cfg.cls}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">{cfg.tip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CockpitFreigabeBadge
 * ────────────────────
 * Zeigt den pädagogischen Freigabe-Status (`content_status`):
 *   approved → Freigegeben
 *   draft    → Entwurf
 */
export function CockpitFreigabeBadge({ contentStatus }) {
  const approved = contentStatus === 'approved';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${approved ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {approved ? <Upload className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
      {approved ? 'Freigegeben' : 'Entwurf'}
    </span>
  );
}

/**
 * CockpitPruefBadge
 * ─────────────────
 * Zeigt für ein Dashboard, ob es geprüft & für die Bearbeitung gesperrt
 * (`locked_for_export`) oder noch offen/in Bearbeitung (`draft`) ist.
 */
export function CockpitPruefBadge({ locked }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${locked ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
            {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {locked ? 'Geprüft' : 'In Bearbeitung'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs">
          {locked
            ? 'Dashboard wurde geprüft und ist für die Bearbeitung gesperrt.'
            : 'Dashboard ist noch offen – Änderungen am Lernpfad sind möglich.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}