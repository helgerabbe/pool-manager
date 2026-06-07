/**
 * KiAufgabenTab.jsx — Schritt 6
 *
 * Payload 4 (Micro-Briefings). Ein Item pro KI-Aktivität bzw.
 * KI-Allgemeiner-Aufgabe. Alle werden gemeinsam als ein Bündel übergeben.
 * Diese Liste dient nur der Kontrolle + bietet pro Item Copy/Download.
 *
 * Die Haupt-Aktionen liegen auf der To-Do-Zeilen-Ebene (ExportTodoRow).
 */
import React from 'react';
import { FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function KiAufgabenTab({
  microItems,
  microGroups,
  itemPlanLookup,
  isInitialExport = false,
  onDownloadBundle,
  onCopyItem,
  onDownloadItem,
  onDownloadGroupZip,
}) {
  const decorateItems = (items) =>
    items.map((it) => ({
      ...it,
      subLabel: (
        <span className="inline-flex items-center gap-1.5">
          <span>{it.subLabel}</span>
          <SyncStatusBadge
            status={planStatusToUiStatus(itemPlanLookup(it.key)?.status)}
            treatStaleAsNew={isInitialExport}
          />
          <code className="text-[10px] text-muted-foreground/70 font-mono">
            {it.key.split('::').pop()}
          </code>
        </span>
      ),
    }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-xl">
          {microItems.length} Item{microItems.length === 1 ? '' : 's'} — pro
          KI-Aktivität ein schlankes Briefing. Werden gemeinsam als ein Bündel
          übergeben. Nur Items mit erstellungs_modus='ki'.
        </p>
        {microItems.length > 0 && onDownloadBundle && (
          <Button size="sm" variant="outline" onClick={onDownloadBundle} className="gap-1.5">
            <FileArchive className="w-3.5 h-3.5" />
            Bundle.zip
          </Button>
        )}
      </div>

      {microGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-2">
          Keine KI-Aktivitäten oder KI-Aufgaben in dieser Einheit.
        </p>
      ) : (
        <div className="space-y-2">
          {microGroups.map((group) => (
            <AirGapBundleGroup
              key={group.key}
              group={{ ...group, items: decorateItems(group.items) }}
              onCopyItem={onCopyItem}
              onDownloadItem={onDownloadItem}
              onDownloadGroupZip={onDownloadGroupZip}
            />
          ))}
        </div>
      )}
    </div>
  );
}