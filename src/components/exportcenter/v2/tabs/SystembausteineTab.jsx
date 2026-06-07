/**
 * SystembausteineTab.jsx — Schritt 5 (airgap-1.6.0)
 *
 * Payload 5 (`mbk_systembaustein_payload`). Pro Lernpfad-Referenz × Lerntyp
 * ein eigenes Briefing-Item. Alle werden gemeinsam als ein Bündel übergeben
 * — der Operator muss sie NICHT einzeln erzeugen. Diese Liste dient nur der
 * Kontrolle + bietet pro Item Copy/Download.
 *
 * Die Haupt-Aktionen liegen auf der To-Do-Zeilen-Ebene (ExportTodoRow).
 */
import React from 'react';
import { FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function SystembausteineTab({
  systembausteinItems,
  systembausteinGroups,
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
            {it.bausteinId}
          </code>
        </span>
      ),
    }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-xl">
          {systembausteinItems.length} Item{systembausteinItems.length === 1 ? '' : 's'} —
          derselbe Baustein erhält pro Lernpfad einen persona-spezifischen
          Inhalt. Werden gemeinsam als ein Bündel übergeben.
        </p>
        {systembausteinItems.length > 0 && onDownloadBundle && (
          <Button size="sm" variant="outline" onClick={onDownloadBundle} className="gap-1.5">
            <FileArchive className="w-3.5 h-3.5" />
            Bundle.zip
          </Button>
        )}
      </div>

      {systembausteinGroups.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-2">
          Keine Systembausteine in den Lernpfaden dieser Einheit referenziert.
        </p>
      ) : (
        <div className="space-y-2">
          {systembausteinGroups.map((group) => (
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