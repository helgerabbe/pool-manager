/**
 * StrukturTab.jsx — Tab 1
 *
 * Payload 2 (Struktur der Einheit). Ein einziger Block mit
 * Copy/Download und Übergabe-Haken. Drift-Status kommt aus dem
 * bulkPlan + Block-Aggregat.
 */
import React from 'react';
import { LayoutList } from 'lucide-react';
import AirGapBlockCard from '@/components/export/airgap/AirGapBlockCard';
import SyncStatusBadge, { planStatusToUiStatus } from '../shared/SyncStatusBadge';

export default function StrukturTab({
  blockStatus,
  blockAggregate,
  planItem,
  onToggleDelivered,
  onCopy,
  onDownload,
}) {
  const uiStatus = planItem ? planStatusToUiStatus(planItem.status) : 'in_sync';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Status dieses Payloads:</span>
        <SyncStatusBadge status={uiStatus} />
      </div>
      <AirGapBlockCard
        index={1}
        icon={<LayoutList className="w-4 h-4 text-primary" />}
        title="Struktur der Einheit"
        description='Themenfelder, Lernpakete, Lernziele, Aktivitäts-Slots und alle vier Lernpfade — als "Inhaltsverzeichnis" für die MBK.'
        delivered={blockStatus.structure.delivered}
        rawDelivered={blockStatus.structure.rawDelivered}
        isStale={blockStatus.structure.isStale || blockAggregate.mbk_structure_payload.hasAnyStale}
        onToggleDelivered={onToggleDelivered}
        onCopy={onCopy}
        onDownload={onDownload}
      />
    </div>
  );
}