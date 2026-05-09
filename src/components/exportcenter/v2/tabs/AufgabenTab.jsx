/**
 * AufgabenTab.jsx — Tab 2
 *
 * Payload 3 (manuelle Aufgabeninhalte). Akkordeon nach
 * Themenfeld → Lernpaket / Allgemeine Aufgabe. Pro Item ein
 * Sync-Status-Badge.
 */
import React from 'react';
import { Package } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import AirGapBundleGroup from '@/components/export/airgap/AirGapBundleGroup';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function AufgabenTab({
  blockStatus,
  blockAggregate,
  taskItems,
  taskGroups,
  taskBundle,
  itemPlanLookup,
  onToggleDelivered,
  onCopy,
  onDownload,
  onDownloadBundle,
  onCopyItem,
  onDownloadItem,
  onDownloadGroupZip,
}) {
  // Erweitert jedes Item um einen sichtbaren Status-Badge in der Liste.
  const decorateItems = (items) =>
    items.map((it) => ({
      ...it,
      // AirGapBundleGroup übergibt Sub-Komponenten den raw item — wir
      // erweitern nur das subLabel optisch, damit der Status sichtbar ist.
      subLabel: (
        <span className="inline-flex items-center gap-1.5">
          <span>{it.subLabel}</span>
          <SyncStatusBadge
            status={planStatusToUiStatus(itemPlanLookup(it.key)?.status)}
          />
          <code className="text-[10px] text-muted-foreground/70 font-mono">
            {it.key.split('::').pop()}
          </code>
        </span>
      ),
    }));

  return (
    <div className="space-y-3">
      <AirGapBlockCard
        index={2}
        icon={<Package className="w-4 h-4 text-primary" />}
        title="Aufgabeninhalte"
        description="Pro Lernpaket bzw. Allgemeiner Aufgabe: ausgearbeitete Inhalte (manuelle field_values, Master-Aufgaben). KI-Aktivitäten werden hier nur strukturell durchgereicht."
        itemCount={taskItems.length}
        delivered={blockStatus.task_content.delivered}
        rawDelivered={blockStatus.task_content.rawDelivered}
        isStale={blockStatus.task_content.isStale || blockAggregate.mbk_task_content_payload.hasAnyStale}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
        onDownloadBundle={taskItems.length > 0 ? onDownloadBundle : null}
      >
        {taskGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-2">
            Keine Lernpakete oder Allgemeine Aufgaben (Ebene 2/3) vorhanden.
          </p>
        ) : (
          <div className="space-y-2">
            {taskGroups.map((group) => (
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
      </AirGapBlockCard>
    </div>
  );
}