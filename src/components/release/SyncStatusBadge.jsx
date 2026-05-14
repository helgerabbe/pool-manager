/**
 * components/release/SyncStatusBadge.jsx
 *
 * Phase 10 des Freigabe-Konzepts (2026-05-14):
 * Vereinheitlichtes Sync-Badge für Aktivitäten + Aufgaben + Lernpakete.
 * Ersetzt den Begriff „nicht exportiert" durch „Neu" und zeigt klar:
 *   - Neu        — noch nie in Moodle gewesen
 *   - In Sync    — letzter Export ist gültig
 *   - Out of Sync — wurde nach dem Export geändert (modified)
 *   - Sync läuft  — pending
 *   - Sync-Fehler — failed/error
 *
 * Bezieht sich nur auf `sync_status` (bzw. `moodle_sync_status`), NICHT auf
 * den Freigabe-Status. Beide Achsen werden bewusst getrennt visualisiert.
 */

import React from 'react';
import { Sparkles, CheckCircle2, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESETS = {
  new: {
    label: 'Neu',
    icon: Sparkles,
    cls: 'bg-blue-50 border-blue-200 text-blue-700',
    title: 'Noch nie in Moodle exportiert',
  },
  synced: {
    label: 'In Sync',
    icon: CheckCircle2,
    cls: 'bg-green-50 border-green-200 text-green-700',
    title: 'Stimmt mit letztem Moodle-Export überein',
  },
  modified: {
    label: 'Out of Sync',
    icon: RefreshCw,
    cls: 'bg-amber-50 border-amber-200 text-amber-800',
    title: 'Wurde nach dem letzten Export geändert',
  },
  pending: {
    label: 'Sync läuft',
    icon: Loader2,
    cls: 'bg-slate-50 border-slate-200 text-slate-700',
    title: 'Synchronisation läuft',
    spin: true,
  },
  error: {
    label: 'Sync-Fehler',
    icon: AlertCircle,
    cls: 'bg-red-50 border-red-200 text-red-700',
    title: 'Letzter Sync ist fehlgeschlagen',
  },
  to_delete: {
    label: 'Wird gelöscht',
    icon: AlertCircle,
    cls: 'bg-slate-100 border-slate-300 text-slate-600',
    title: 'Wird beim nächsten Export entfernt',
  },
};

export default function SyncStatusBadge({ status = 'new', className = '' }) {
  const p = PRESETS[status] || PRESETS.new;
  const Icon = p.icon;
  return (
    <span
      title={p.title}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        p.cls,
        className
      )}
    >
      <Icon className={cn('w-3 h-3', p.spin && 'animate-spin')} />
      {p.label}
    </span>
  );
}