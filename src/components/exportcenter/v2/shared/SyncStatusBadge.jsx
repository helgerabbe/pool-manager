/**
 * SyncStatusBadge.jsx
 *
 * Vier-Werte-Badge für den internen MBK-Air-Gap-Generator-Status. Wichtig:
 * Dieser Status hat NICHTS mit Moodle-Sync zu tun — er beschreibt nur, ob
 * der lokal gespeicherte Air-Gap-Payload-Record (in `ExportPrompts`) noch
 * aktuell ist oder neu generiert werden muss. „Neu generieren" passiert
 * z. B., wenn ein Admin einen UI-Baustein oder einen globalen Prompt
 * anpasst — der gespeicherte Hash passt dann nicht mehr zum aktuellen.
 *
 *   - 'new'              → "Neu"               (noch nie generiert)
 *   - 'in_sync'          → "Aktuell"           (Payload ist aktuell)
 *   - 'out_of_sync'      → "Neu generieren"    (Payload veraltet — globale Regeln geändert)
 *   - 'blocked'          → "Blockiert"         (Quelle nicht freigegeben)
 *
 * Der Badge mappt die Plan-Status-Werte aus `airGapBulkPlan.js`:
 *   'new'              → 'new'
 *   'update'           → 'out_of_sync'
 *   'skip-current'     → 'in_sync'
 *   'skip-customized'  → 'in_sync'
 *   'skip-blocked'     → 'blocked'
 *
 * Initial-Export (Einheit noch nie nach Moodle exportiert): das Air-Gap-
 * Panel kann `treatStaleAsNew` setzen, dann werden 'out_of_sync'-Items als
 * 'new' gerendert (semantisch identisch — beides "muss noch generiert
 * werden", und "veraltet" wäre vor dem ersten Export irreführend).
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle2, RotateCcw, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const META = {
  new: {
    label: 'Neu',
    icon: Sparkles,
    cls: 'bg-blue-100 text-blue-800 border-blue-300',
    title: 'Dieser Payload wurde noch nie generiert.',
  },
  in_sync: {
    label: 'Aktuell',
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    title: 'Dieser Payload ist auf dem aktuellen Stand.',
  },
  out_of_sync: {
    label: 'Neu generieren',
    icon: RotateCcw,
    cls: 'bg-amber-100 text-amber-900 border-amber-300',
    title:
      'Globale Regeln (UI-Bausteine, Mission-Statement, Lerntypen-Definitionen) '
      + 'wurden seit der letzten Generierung geändert. Dieser Payload sollte erneut '
      + 'erzeugt werden, bevor er an die MBK übergeben wird.',
  },
  blocked: {
    label: 'Blockiert',
    icon: Lock,
    cls: 'bg-slate-100 text-slate-700 border-slate-300',
    title: 'Quelle ist noch nicht freigegeben.',
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

export default function SyncStatusBadge({ status, className, treatStaleAsNew = false }) {
  // Initial-Export-Sonderfall: vor dem ersten Moodle-Export macht
  // „veraltet" semantisch keinen Sinn — wir zeigen dann "Neu" an.
  const effective = treatStaleAsNew && status === 'out_of_sync' ? 'new' : status;
  const m = META[effective] || META.in_sync;
  const Icon = m.icon;
  return (
    <Badge className={cn('text-[10px] gap-1 border', m.cls, className)} title={m.title}>
      <Icon className="w-3 h-3" />
      {m.label}
    </Badge>
  );
}