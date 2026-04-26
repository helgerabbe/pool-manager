/**
 * ExportItemRow.jsx
 *
 * Eine einzelne Export-Zeile (Einheit oder Basismodul) inkl. Checkbox,
 * Status-Badge, "Sync OK"-Bestätigungsbutton und nachgelagertem
 * Sync-Warning-Banner.
 *
 * Reine Anzeige-Komponente – keine Datenmutationen, alle Aktionen
 * werden per Callback (`onToggle`, `onConfirmSync`) nach oben gereicht.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check } from 'lucide-react';
import { formatExportDate } from '@/lib/statusLogic';
import SyncWarningBanner from '@/components/sync/SyncWarningBanner';
import ExportStatusBadge from '@/components/export/ExportStatusBadge';

export default function ExportItemRow({
  item,
  isSelected,
  onToggle,
  isBasismodul = false,
  onConfirmSync,
}) {
  const title = isBasismodul ? item.titel : item.titel_der_einheit;
  const subtitle = isBasismodul
    ? `Fach: ${item.fach}`
    : `${item.fach} · Jahrgang ${item.jahrgangsstufe}`;

  const isExportedWaitingSync = item.last_exported_at && !item.last_synced_at;
  const exportDate = item.last_exported_at ? formatExportDate(item.last_exported_at) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
        <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          {exportDate && (
            <p className="text-xs text-slate-600 mt-2">
              💾 Zuletzt exportiert: {exportDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportStatusBadge item={item} />
          {isExportedWaitingSync && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onConfirmSync(item.id)}
              className="h-7 text-xs gap-1"
            >
              <Check className="w-3 h-3" />
              Sync OK
            </Button>
          )}
        </div>
      </div>

      <SyncWarningBanner item={item} isBasismodul={isBasismodul} />
    </div>
  );
}