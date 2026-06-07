/**
 * EinheitExportLifecycleBadge.jsx
 *
 * Kompakter Lebenszyklus-Status für die Einheitenkarte in der Übersicht.
 * Zeigt auf JEDER Kachel einen der vier Zustände – abgeleitet aus den
 * Feldern, die ohnehin auf der Einheit liegen (kein Nachladen der
 * Kind-Elemente nötig):
 *
 *   - Neu        (grau)   → noch nie nach Moodle veröffentlicht
 *   - Im Export  (orange) → final freigegeben / Export läuft
 *   - Synchron   (grün)   → veröffentlicht & seither unverändert
 *   - Asynchron  (gelb)   → veröffentlicht & seither geändert
 *
 * Wird in `EinheitCard.jsx` unter dem Titel ausgegeben.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { EXPORT_LIFECYCLE_STATUS } from '@/lib/exportLifecycle';

const META = {
  neu: {
    icon: Sparkles,
    label: 'Neu',
    cls: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  im_export: {
    icon: Truck,
    label: 'Im Export',
    cls: 'bg-orange-100 text-orange-800 border border-orange-200',
  },
  synchron: {
    icon: CheckCircle2,
    label: 'Synchron',
    cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  },
  asynchron: {
    icon: AlertTriangle,
    label: 'Asynchron',
    cls: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
};

/**
 * Leitet den Lebenszyklus-Status für die Kachel ab.
 * @param {object} einheit
 * @returns {'neu' | 'im_export' | 'synchron' | 'asynchron'}
 */
function deriveLifecycle(einheit) {
  const status = einheit?.export_lifecycle_status;

  // Aktiver Export-Vorgang hat Vorrang vor allem anderen.
  if (
    status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN ||
    status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING
  ) {
    return 'im_export';
  }

  // Wurde die Einheit schon einmal veröffentlicht?
  const publishedAt = einheit?.export_published_at;
  if (!publishedAt) return 'neu';

  const publishedTs = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTs)) return 'neu';

  // Veröffentlicht – geändert seither? (Einheit-Ebene als Proxy)
  const updatedTs = einheit?.updated_date
    ? new Date(einheit.updated_date).getTime()
    : 0;
  if (!Number.isNaN(updatedTs) && updatedTs > publishedTs + 1000) {
    return 'asynchron';
  }
  return 'synchron';
}

export default function EinheitExportLifecycleBadge({ einheit, status }) {
  // Rückwärtskompatibel: alte Aufrufe mit nur `status` weiter unterstützen,
  // bevorzugt aber das vollständige `einheit`-Objekt.
  const key = deriveLifecycle(einheit || { export_lifecycle_status: status });
  const meta = META[key];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <Badge className={`${meta.cls} gap-1`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </Badge>
  );
}