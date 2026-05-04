/**
 * EinheitExportLifecycleBadge.jsx
 *
 * Phase D – kompakter Status-Badge für die Einheitenkarte in der
 * Übersicht. Zeigt den `export_lifecycle_status` als kleine Pille:
 *
 *   - DRAFT             → unsichtbar (Default, kein Badge)
 *   - FINAL_FREIGEGEBEN → orange „Final freigegeben"
 *   - EXPORT_RUNNING    → orange „Im Export"
 *   - PUBLISHED         → blau „Veröffentlicht"
 *
 * Wird in `EinheitCard.jsx` neben den anderen Status-Badges ausgegeben.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Lock, Truck, CheckCircle2 } from 'lucide-react';
import { EXPORT_LIFECYCLE_STATUS, EXPORT_LIFECYCLE_LABELS } from '@/lib/exportLifecycle';

const META = {
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: {
    icon: Lock,
    cls: 'bg-orange-100 text-orange-800 border border-orange-200',
  },
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: {
    icon: Truck,
    cls: 'bg-orange-100 text-orange-800 border border-orange-200',
  },
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: {
    icon: CheckCircle2,
    cls: 'bg-blue-100 text-blue-800 border border-blue-200',
  },
};

export default function EinheitExportLifecycleBadge({ status }) {
  const meta = META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  const label = EXPORT_LIFECYCLE_LABELS[status] || status;
  return (
    <Badge className={`${meta.cls} gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}