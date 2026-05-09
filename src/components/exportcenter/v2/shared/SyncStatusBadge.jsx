/**
 * SyncStatusBadge.jsx
 *
 * Drei-Werte-Badge für den Sync-Status eines Air-Gap-Items:
 *   - 'new'         → "Neu"           (noch nie übergeben — DB-Record fehlt)
 *   - 'in_sync'     → "In Sync"       (DB-Record aktuell + nicht out-of-sync)
 *   - 'out_of_sync' → "Out of Sync"   (DB-Record veraltet)
 *   - 'blocked'     → "Blockiert"     (Quelle nicht freigegeben — neutral)
 *
 * Der Badge mappt die Plan-Status-Werte aus `airGapBulkPlan.js`:
 *   plan-status → ui-status
 *   'new'              → 'new'
 *   'update'           → 'out_of_sync'
 *   'skip-current'     → 'in_sync'
 *   'skip-customized'  → 'in_sync'
 *   'skip-blocked'     → 'blocked'
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const META = {
  new: {
    label: 'Neu',
    icon: Sparkles,
    cls: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  in_sync: {
    label: 'In Sync',
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  out_of_sync: {
    label: 'Out of Sync',
    icon: AlertTriangle,
    cls: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  blocked: {
    label: 'Blockiert',
    icon: Lock,
    cls: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export function planStatusToUiStatus(planStatus) {
  switch (planStatus) {
    case 'new': return 'new';
    case 'update': return 'out_of_sync';
    case 'skip-current':
    case 'skip-customized': return 'in_sync';
    case 'skip-blocked': return 'blocked';
    default: return 'in_sync';
  }
}

export default function SyncStatusBadge({ status, className }) {
  const m = META[status] || META.in_sync;
  const Icon = m.icon;
  return (
    <Badge className={cn('text-[10px] gap-1 border', m.cls, className)}>
      <Icon className="w-3 h-3" />
      {m.label}
    </Badge>
  );
}